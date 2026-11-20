// 日付・金額の計算と表示
import type { Sub } from './types'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const DAY = 864e5

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5)
export const yen = (n: number) => '¥' + Math.round(n).toLocaleString('en-US')

export function todayD(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseYMD(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '')
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d.getTime()) ? null : d
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** n か月後の同じ日。その月に無い日（31 日など）は月末にそろえる */
function addMonthsClamp(base: Date, n: number, day: number): Date {
  const y = base.getFullYear()
  const m = base.getMonth() + n
  const last = new Date(y, m + 1, 0).getDate()
  return new Date(y, m, Math.min(day, last))
}

/** 今日以降で最も近い支払日。登録した日付が過ぎていれば周期ぶん進める */
export function nextDate(s: Pick<Sub, 'next' | 'cycle'>): Date {
  const base = parseYMD(s.next)
  const t = todayD()
  if (!base) return t
  if (base.getTime() >= t.getTime()) return base
  if (s.cycle === 'week') {
    const diff = Math.round((t.getTime() - base.getTime()) / DAY)
    return addDays(base, Math.ceil(diff / 7) * 7)
  }
  const step = s.cycle === 'year' ? 12 : 1
  const months =
    (t.getFullYear() - base.getFullYear()) * 12 +
    (t.getMonth() - base.getMonth())
  let k = Math.max(1, Math.floor(months / step))
  let d = addMonthsClamp(base, k * step, base.getDate())
  for (let g = 0; d.getTime() < t.getTime() && g < 5; g++) {
    k++
    d = addMonthsClamp(base, k * step, base.getDate())
  }
  return d
}

export const diffDays = (d: Date) =>
  Math.round((d.getTime() - todayD().getTime()) / DAY)
/** 例：Mon, Nov 23 */
export const fullDate = (d: Date) =>
  `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`
/** 例：Nov 23 */
export const shortDate = (d: Date) => `${MON[d.getMonth()]} ${d.getDate()}`
export const dueLabel = (n: number) =>
  n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`
/** 例：1 card / 3 cards */
export const cardCount = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`

type Priced = Pick<Sub, 'cycle' | 'price'>
export const monthlyOf = (s: Priced) =>
  s.cycle === 'year'
    ? s.price / 12
    : s.cycle === 'week'
      ? (s.price * 52) / 12
      : s.price
export const yearlyOf = (s: Priced) =>
  s.cycle === 'year'
    ? s.price
    : s.cycle === 'week'
      ? s.price * 52
      : s.price * 12

/** 金額の入力を数値にする。カンマ・「¥」のほか、日本語入力の全角数字・「円」も許す。読めなければ null */
export function parsePrice(v: string): number | null {
  const s = String(v)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，¥￥円\s]/g, '')
  return /^\d{1,8}$/.test(s) ? +s : null
}

/** 次の支払日が近い順に並べる */
export function sortByNext(subs: Sub[]): Sub[] {
  return subs
    .map((s) => ({ s, d: nextDate(s).getTime() }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.s)
}
