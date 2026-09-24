// Two "devices" syncing through a fake in-memory GitHub Gist API.
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright')
const assert = require('node:assert/strict')
const fs = require('fs')
const URL = process.env.URL || 'http://localhost:5173/DairyOptimizer/'

const gists = new Map()
let n = 0
async function fakeGitHub(route) {
  const req = route.request()
  const url = new URL_(req.url())
  const auth = req.headers()['authorization']
  const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
  if (auth !== 'Bearer good-token') return json(401, { message: 'Bad credentials' })
  if (url.pathname === '/user') return json(200, { login: 'tester' })
  if (url.pathname === '/gists' && req.method() === 'GET') return json(200, [...gists.values()].map((g) => ({ id: g.id, files: Object.fromEntries(Object.keys(g.files).map((k) => [k, {}])) })))
  if (url.pathname === '/gists' && req.method() === 'POST') {
    const body = JSON.parse(req.postData())
    const g = { id: `g${++n}`, public: body.public, files: body.files }
    gists.set(g.id, g)
    return json(201, g)
  }
  const m = url.pathname.match(/^\/gists\/(\w+)$/)
  if (m) {
    const g = gists.get(m[1])
    if (!g) return json(404, {})
    if (req.method() === 'PATCH') Object.assign(g.files, JSON.parse(req.postData()).files)
    return json(200, { id: g.id, files: Object.fromEntries(Object.entries(g.files).map(([k, v]) => [k, { content: v.content, truncated: false, raw_url: '' }])) })
  }
  return json(404, {})
}
const URL_ = globalThis.URL

;(async () => {
  const b = await chromium.launch({ channel: 'chrome' })
  const device = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    await ctx.route('https://api.github.com/**', fakeGitHub)
    const p = await ctx.newPage()
    p.on('pageerror', (e) => console.log('pageerror', e.message))
    await p.goto(URL)
    await p.waitForFunction(() => window.__store && window.__sync)
    return p
  }
  const addTask = (p, title) =>
    p.evaluate((t) => window.__store.getState().put('tasks', { id: crypto.randomUUID(), updatedAt: 0, title: t, notes: '', checklist: [], due: null, plan: null, subjectId: null, duration: 30, flagged: false, doneAt: null, createdAt: Date.now(), private: false, enc: null }), title)
  const titles = (p) => p.evaluate(() => window.__store.getState().doc.tasks.filter((t) => !t.deleted).map((t) => t.title).sort())
  const step = async (name, fn) => {
    try {
      await fn()
      console.log('ok  ', name)
    } catch (e) {
      console.log('FAIL', name, '\n    ', e.message.split('\n')[0])
    }
  }

  const A = await device()
  const B = await device()

  await step('wrong token is rejected with a clear message', async () => {
    const msg = await A.evaluate(() => window.__sync.connect('bad', 'passphrase1').then(() => 'connected', (e) => e.message))
    assert.match(msg, /token/i)
  })

  await step('iPad connects and creates an encrypted secret gist', async () => {
    await addTask(A, 'จาก iPad')
    await A.evaluate(() => window.__sync.connect('good-token', 'passphrase1'))
    assert.equal(gists.size, 1)
    const g = [...gists.values()][0]
    assert.equal(g.public, false)
    const content = g.files['achieve-sync.json'].content
    assert.ok(!content.includes('จาก iPad'), 'gist content is plaintext')
    assert.ok(JSON.parse(content).data)
  })

  await step('phone with wrong passphrase cannot read it', async () => {
    const msg = await B.evaluate(() => window.__sync.connect('good-token', 'wrongpass').then(() => 'connected', (e) => e.message))
    assert.match(msg, /passphrase/)
  })

  await step('phone merges its own offline edits with the iPad data', async () => {
    await addTask(B, 'จากมือถือ')
    await B.evaluate(() => window.__sync.connect('good-token', 'passphrase1'))
    assert.deepEqual(await titles(B), ['จาก iPad', 'จากมือถือ'])
    await A.evaluate(() => window.__sync.syncNow())
    assert.deepEqual(await titles(A), ['จาก iPad', 'จากมือถือ'])
    // Timetable seeds must not duplicate across devices.
    assert.equal(await A.evaluate(() => window.__store.getState().doc.classes.length), 12)
  })

  await step('delete + edit propagate both ways', async () => {
    await A.evaluate(() => {
      const s = window.__store.getState()
      const t = s.doc.tasks.find((x) => x.title === 'จากมือถือ')
      s.remove('tasks', [t.id])
    })
    await A.evaluate(() => window.__sync.syncNow())
    await B.evaluate(() => {
      const s = window.__store.getState()
      const t = s.doc.tasks.find((x) => x.title === 'จาก iPad')
      s.patch('tasks', t.id, { title: 'จาก iPad (แก้บนมือถือ)' })
    })
    await B.evaluate(() => window.__sync.syncNow())
    await A.evaluate(() => window.__sync.syncNow())
    assert.deepEqual(await titles(A), ['จาก iPad (แก้บนมือถือ)'])
    assert.deepEqual(await titles(B), ['จาก iPad (แก้บนมือถือ)'])
  })

  await step('private task stays sealed in sync and opens with the same PIN on the other device', async () => {
    await A.evaluate(async () => {
      const s = window.__store.getState()
      await s.setPin('246810')
      await s.saveTask({ id: 'p1', updatedAt: 0, title: '', notes: '', checklist: [], due: null, plan: null, subjectId: null, duration: 30, flagged: false, doneAt: null, createdAt: Date.now(), private: true, enc: null }, { title: 'ความลับ', notes: '', checklist: [] })
    })
    await A.evaluate(() => window.__sync.syncNow())
    await B.evaluate(() => window.__sync.syncNow())
    const locked = await B.evaluate(() => window.__store.getState().doc.tasks.find((t) => t.id === 'p1'))
    assert.equal(locked.title, '')
    assert.ok(await B.evaluate(() => window.__store.getState().unlock('246810')))
    assert.equal(await B.evaluate(() => window.__store.getState().secrets.p1?.title), 'ความลับ')
  })

  await b.close()
})()
