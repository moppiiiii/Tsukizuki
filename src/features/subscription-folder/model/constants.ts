import type { Cycle } from './types'

/** カードの色味の選択肢 [色, 名前] */
export const CARD_COLORS: ReadonlyArray<readonly [string, string]> = [
  ['#1C2238', 'Midnight'],
  ['#2A3FBF', 'Cobalt'],
  ['#3B4A6B', 'Slate'],
  ['#2E5E5A', 'Deep teal'],
  ['#557364', 'Sage'],
  ['#8FA9B8', 'Ice blue'],
  ['#B6925A', 'Champagne'],
  ['#8E5E56', 'Rose clay'],
  ['#C0306A', 'Magenta'],
  ['#6A2E3A', 'Wine'],
  ['#4E3B5C', 'Plum'],
  ['#E4DFD4', 'Pearl'],
]

/** フォルダの色。画面では選ばせず、使われていない色から自動で割り当てる */
export const FOLDER_COLORS: readonly string[] = [
  '#C0306A',
  '#2A3FBF',
  '#3B4A6B',
  '#2E5E5A',
  '#557364',
  '#B6925A',
  '#8E5E56',
  '#4E3B5C',
  '#4A4E57',
]

/** 所属フォルダが見つからないサブスクを入れるフォルダ */
export const UNSORTED = { name: 'Unsorted', color: '#4A4E57' } as const

/** 候補のうち、使われている回数が最も少ないもの（色や柄がかぶりにくいように選ぶ） */
export function leastUsed(
  candidates: readonly string[],
  used: readonly string[],
): string {
  const count = new Map(candidates.map((c) => [c, 0]))
  used.forEach((c) => {
    const n = count.get(c)
    if (n !== undefined) count.set(c, n + 1)
  })
  return [...candidates].sort(
    (a, b) => (count.get(a) ?? 0) - (count.get(b) ?? 0),
  )[0]
}

export const CYCLE_LABEL: Record<Cycle, string> = {
  month: 'Monthly',
  year: 'Yearly',
  week: 'Weekly',
}
export const CYCLES: readonly Cycle[] = ['month', 'year', 'week']
