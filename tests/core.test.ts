import { describe, expect, it } from 'vitest'
import { seedClasses, seedDoc } from '../src/data/seed'
import type { Doc, Habit, Task } from '../src/data/types'
import { agendaFor, conflictsWith, freeSlots } from '../src/lib/agenda'
import { createPin, decryptJSON, deriveKey, encryptJSON, toB64, unlockPin } from '../src/lib/crypto'
import { addDays, weekStart } from '../src/lib/date'
import { bestStreak, streak } from '../src/lib/habits'
import { convertLegacy, type LegacyBackup } from '../src/lib/legacy'
import { docSignature, mergeDocs, mergeRecords } from '../src/lib/merge'
import { goalProgress, parseBaht, summarize } from '../src/lib/money'

const task = (o: Partial<Task>): Task => ({
  id: 't',
  updatedAt: 1,
  title: 'x',
  notes: '',
  checklist: [],
  due: null,
  plan: null,
  subjectId: null,
  duration: 30,
  flagged: false,
  doneAt: null,
  createdAt: 1,
  private: false,
  enc: null,
  ...o,
})

describe('timetable seed', () => {
  it('matches the real schedule', () => {
    const rows = seedClasses().map((c) => `${c.day} ${c.start}-${c.end} ${c.subjectId.slice(4)} ${c.room}`)
    expect(rows).toEqual([
      '1 10:00-11:50 273387-1 SC2-307',
      '1 13:00-14:50 254383-2 SC2-414',
      '2 10:00-11:50 254363-3 SC2-212',
      '2 13:00-14:50 254374-5 SC2-208',
      '2 15:00-16:50 254383-2 SC2-214',
      '3 10:00-11:50 273387-1 SC2-307',
      '3 13:00-14:50 254388-1 SC2-414',
      '3 15:00-16:50 273488-1 SC2-307',
      '4 10:00-11:50 254388-1 SC2-212',
      '4 15:00-16:50 254374-5 SC2-208',
      '5 10:00-11:50 254363-3 SC2-308',
      '5 15:00-16:50 273488-1 SC2-208',
    ])
  })
})

describe('merge', () => {
  it('keeps the newest version of each record', () => {
    const a = [task({ id: '1', title: 'old', updatedAt: 5 }), task({ id: '2', updatedAt: 3 })]
    const b = [task({ id: '1', title: 'new', updatedAt: 9 }), task({ id: '3', updatedAt: 1 })]
    const m = mergeRecords(a, b, 10)
    expect(m.map((t) => t.id).sort()).toEqual(['1', '2', '3'])
    expect(m.find((t) => t.id === '1')!.title).toBe('new')
  })

  it('is order independent and idempotent', () => {
    const today = '2026-09-24'
    const a = seedDoc(today)
    const b = seedDoc(today)
    a.tasks = [task({ id: 'x', updatedAt: 4 })]
    b.tasks = [task({ id: 'x', updatedAt: 4, title: 'tie' }), task({ id: 'y', updatedAt: 2 })]
    const ab = mergeDocs(a, b, 100)
    const ba = mergeDocs(b, a, 100)
    expect(docSignature(ab)).toBe(docSignature(ba))
    expect(docSignature(mergeDocs(ab, ab, 100))).toBe(docSignature(ab))
  })

  it('lets deletions win when newer and drops old tombstones', () => {
    const live = task({ id: '1', updatedAt: 5 })
    const dead = { ...live, updatedAt: 6, deleted: true }
    expect(mergeRecords([live], [dead], 10)[0].deleted).toBe(true)
    expect(mergeRecords([live], [dead], 6 + 200 * 86_400_000)).toHaveLength(0)
  })
})

describe('agenda', () => {
  const doc: Doc = seedDoc('2026-09-24')
  it('finds free time around Thursday classes', () => {
    const items = agendaFor(doc, '2026-09-24')
    expect(items.map((i) => i.start)).toEqual(['10:00', '15:00'])
    expect(freeSlots(items, '08:00', '22:00')).toEqual([
      { start: '08:00', end: '10:00', minutes: 120 },
      { start: '11:50', end: '15:00', minutes: 190 },
      { start: '16:50', end: '22:00', minutes: 310 },
    ])
  })
  it('skips time already past and tiny gaps', () => {
    const slots = freeSlots([{ start: '09:00', end: '09:50' }, { start: '10:00', end: '11:00' }], '08:00', '12:00', 8 * 60 + 30)
    expect(slots).toEqual([
      { start: '08:30', end: '09:00', minutes: 30 },
      { start: '11:00', end: '12:00', minutes: 60 },
    ])
  })
  it('reports overlaps with classes', () => {
    expect(conflictsWith(doc, '2026-09-24', '11:00', '12:00').map((c) => c.id)).toEqual(['cls-4-1000'])
    expect(conflictsWith(doc, '2026-09-24', '11:50', '12:00')).toHaveLength(0)
  })
})

describe('habits', () => {
  const h: Habit = {
    id: 'h', updatedAt: 1, title: 'h', cue: '', mode: 'days', days: [1, 3, 5], icon: 'x', color: '#fff',
    createdAt: '2026-09-01', archived: false, order: 0,
  }
  it('counts only scheduled days and forgives an unfinished today', () => {
    // Mon 21, Wed 23, Fri 18 done; today Thu 24 is not scheduled.
    const done = new Set(['2026-09-18', '2026-09-21', '2026-09-23'])
    expect(streak(h, done, '2026-09-24')).toBe(3)
    expect(streak(h, done, '2026-09-25')).toBe(3)
    expect(streak(h, done, '2026-09-26')).toBe(0)
    expect(bestStreak(h, done, '2026-09-24')).toBe(3)
  })
  it('never fails context habits on idle days', () => {
    const c = { ...h, mode: 'context' as const }
    const done = new Set(['2026-09-10', '2026-09-20'])
    expect(streak(c, done, '2026-09-24')).toBe(2)
  })
})

describe('money', () => {
  it('parses baht into satang safely', () => {
    expect(parseBaht('1,234.5')).toBe(123450)
    expect(parseBaht('0.1')).toBe(10)
    expect(parseBaht('0')).toBeNull()
    expect(parseBaht('1.234')).toBeNull()
    expect(parseBaht('abc')).toBeNull()
  })
  it('summarises a month without float drift', () => {
    const tx = (amount: number, date: string, type: 'income' | 'expense' = 'expense') => ({ id: date + amount, updatedAt: 1, type, amount, category: 'อาหาร', note: '', date, createdAt: 1 })
    const s = summarize([tx(10, '2026-09-01'), tx(20, '2026-09-01'), tx(5, '2026-09-03'), tx(999, '2026-08-31'), tx(100, '2026-09-02', 'income')], '2026-09')
    expect(s.expense).toBe(35)
    expect(s.income).toBe(100)
    expect(s.cumulative.slice(0, 4)).toEqual([30, 30, 35, 35])
  })
  it('works out the monthly saving needed for a goal', () => {
    const g = { id: 'g', updatedAt: 1, name: 'x', target: 1_000_000, deadline: addDays('2026-09-24', 304), color: '', createdAt: '2026-09-01', archived: false }
    const p = goalProgress(g, [{ id: 'e', updatedAt: 1, goalId: 'g', amount: 400_000, date: '2026-09-02', note: '' }], '2026-09-24')
    expect(p.saved).toBe(400_000)
    expect(p.remaining).toBe(600_000)
    expect(p.perMonth).toBe(60_100)
  })
})

describe('dates', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-09-24')).toBe('2026-09-21')
    expect(weekStart('2026-09-27')).toBe('2026-09-21')
  })
})

describe('crypto', () => {
  it('seals with a PIN and rejects a wrong one', async () => {
    const { config, key } = await createPin('123456')
    const box = await encryptJSON(key, { title: 'secret' })
    expect(await unlockPin('000000', config)).toBeNull()
    const again = await unlockPin('123456', config)
    expect(await decryptJSON(again!, box)).toEqual({ title: 'secret' })
  }, 20_000)
})

describe('legacy import', () => {
  it('converts an old Achieve backup, opening locked tasks with the old PIN', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await deriveKey('9876543', salt, 310_000)
    const sealed = await encryptJSON(key, { title: 'ลับ', notes: 'n', due: '2026-09-30', duration: 45, priority: 'high', checklist: [{ title: 'a', done: true }] })
    const backup: LegacyBackup = {
      version: 2,
      transactions: [{ id: 'tx1', type: 'expense', amount: 12.5, date: '2026-09-20', note: '', category: 'อาหาร', created: 5 }],
      tasks: [
        { id: 'a1', done: false, locked: false, title: 'งานเปิด', notes: '', due: '', duration: 30, priority: 'normal', subject: '254383-2' },
        { id: 'a2', done: false, locked: true, salt: toB64(salt), iv: sealed.iv, cipher: sealed.data },
      ],
      events: [{ id: 'e1', date: '2026-09-25', start: '18:00', end: '19:00', taskId: 'a2' }],
      savings: [{ id: 's1', amount: 500, date: '2026-09-01' }],
      goal: { name: 'ทริป', target: 5000, startDate: '2026-09-01', endDate: '2026-12-31' },
      budget: 6000,
      budgetConfigured: true,
      subjects: [{ id: '254383-2', name: 'Algorithm Design and Analysis', thai: 'การออกแบบและวิเคราะห์อัลกอริทึม' }],
      schedule: [{ id: 'old', day: 1, subject: '254383-2', start: '13:00', end: '14:50', room: 'SC2-414' }],
      habits: [{ id: 'oh', title: 'วางมือถือให้ไกล', cue: '', kind: 'context', days: [0, 1, 2, 3, 4, 5, 6], created: '2026-09-01', archived: false, icon: 'phone', color: '#fff' }],
      habitLogs: [{ id: 'l1', habitId: 'oh', date: '2026-09-10' }],
    }
    const { decryptLegacy } = await import('../src/lib/crypto')
    const conv = await convertLegacy(backup, (box) => decryptLegacy<Record<string, unknown>>(box, '9876543').catch(() => null), '2026-09-24', 1000)
    expect(conv.skippedLocked).toBe(0)
    expect(conv.privateIds).toEqual(['a2'])
    const secret = conv.doc.tasks.find((t) => t.id === 'a2')!
    expect(secret).toMatchObject({ title: 'ลับ', due: '2026-09-30', duration: 45, flagged: true, private: true })
    expect(conv.doc.tasks.find((t) => t.id === 'a1')).toMatchObject({ due: null, subjectId: 'sub-254383-2' })
    expect(conv.doc.txs[0].amount).toBe(1250)
    expect(conv.doc.goals[0]).toMatchObject({ name: 'ทริป', target: 500000, deadline: '2026-12-31' })
    expect(conv.doc.goalEntries[0].amount).toBe(50000)
    expect(conv.doc.classes).toHaveLength(0)
    expect(conv.doc.habits[0].id).toBe('habit-phone-away')
    expect(conv.doc.habitLogs[0].id).toBe('habit-phone-away_2026-09-10')
    expect(conv.budget).toBe(600000)

    const skipped = await convertLegacy(backup, null, '2026-09-24', 1000)
    expect(skipped.skippedLocked).toBe(1)
    expect(skipped.doc.events).toHaveLength(0)
  }, 30_000)
})
