import { COLLECTIONS, type Doc, type Rec } from '../data/types'

const TOMBSTONE_TTL = 120 * 86_400_000

/** Per-record last-writer-wins. Commutative and idempotent, so devices converge whatever the sync order. */
export function mergeRecords<T extends Rec>(a: T[], b: T[], now = Date.now()): T[] {
  const byId = new Map<string, T>()
  for (const r of a) byId.set(r.id, r)
  for (const r of b) {
    const cur = byId.get(r.id)
    if (!cur || r.updatedAt > cur.updatedAt || (r.updatedAt === cur.updatedAt && stable(r) > stable(cur))) byId.set(r.id, r)
  }
  return [...byId.values()].filter((r) => !(r.deleted && now - r.updatedAt > TOMBSTONE_TTL))
}

export function mergeDocs(a: Doc, b: Doc, now = Date.now()): Doc {
  const out = { schema: 3 } as Doc
  for (const k of COLLECTIONS) (out as unknown as Record<string, Rec[]>)[k] = mergeRecords(a[k] as Rec[], b[k] as Rec[], now)
  return out
}

/** Deterministic JSON so equal docs compare equal regardless of key or record order. */
export function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(v)
}

export function docSignature(doc: Doc): string {
  const sorted = {} as Record<string, Rec[]>
  for (const k of COLLECTIONS) sorted[k] = [...(doc[k] as Rec[])].sort((x, y) => (x.id < y.id ? -1 : 1))
  return stable(sorted)
}
