import type { Goal, GoalEntry, Tx } from '../data/types'
import { daysBetween, daysInMonth, monthOf } from './date'

const fmt = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2, minimumFractionDigits: 0 })

/** Satang → "1,234" or "1,234.50". */
export const baht = (satang: number) => fmt.format(Math.abs(satang) / 100)

export const signedBaht = (satang: number, type: 'income' | 'expense') => `${type === 'income' ? '+' : '−'}฿${baht(satang)}`

/** User text → satang, or null if not a positive amount. */
export function parseBaht(text: string): number | null {
  const clean = text.replace(/[,\s฿]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null
  const value = Math.round(Number(clean) * 100)
  return value > 0 && value <= 100_000_000_00 ? value : null
}

export interface MonthSummary {
  income: number
  expense: number
  byCategory: { name: string; amount: number }[]
  /** Cumulative expense at the end of each day of the month. */
  cumulative: number[]
}

export function summarize(txs: Tx[], month: string): MonthSummary {
  const days = daysInMonth(month)
  const perDay = new Array<number>(days).fill(0)
  const cats = new Map<string, number>()
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.deleted || monthOf(t.date) !== month) continue
    if (t.type === 'income') income += t.amount
    else {
      expense += t.amount
      perDay[Number(t.date.slice(8)) - 1] += t.amount
      cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount)
    }
  }
  const cumulative: number[] = []
  perDay.reduce((sum, v, i) => (cumulative[i] = sum + v), 0)
  return {
    income,
    expense,
    byCategory: [...cats].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
    cumulative,
  }
}

export const savedIn = (entries: GoalEntry[], month: string) =>
  entries.filter((e) => !e.deleted && monthOf(e.date) === month).reduce((s, e) => s + e.amount, 0)

export interface GoalProgress {
  saved: number
  ratio: number
  remaining: number
  /** Satang per month still needed to hit the deadline (null when no deadline / already reached). */
  perMonth: number | null
  daysLeft: number | null
}

export function goalProgress(goal: Goal, entries: GoalEntry[], today: string): GoalProgress {
  const saved = Math.max(0, entries.filter((e) => !e.deleted && e.goalId === goal.id).reduce((s, e) => s + e.amount, 0))
  const remaining = Math.max(0, goal.target - saved)
  const daysLeft = goal.deadline ? daysBetween(today, goal.deadline) : null
  let perMonth: number | null = null
  if (daysLeft !== null && remaining > 0) perMonth = Math.ceil(remaining / Math.max(1, daysLeft / 30.44) / 100) * 100
  return { saved, ratio: goal.target ? Math.min(1, saved / goal.target) : 0, remaining, perMonth, daysLeft }
}
