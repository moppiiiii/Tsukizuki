// データの保存と読み込み。この端末のブラウザ（localStorage）にだけ保存する。
import { CYCLES } from './constants'
import type { AppData, Folder, Sub } from './types'

const KEY = 'tsukizuki:data:v1'

const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)
const isHex = (v: unknown): v is string =>
  isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v)

function toFolder(v: unknown): Folder | null {
  const o = v as Partial<Folder> | null
  if (!o || !isStr(o.id) || !isStr(o.name) || !isHex(o.color)) return null
  return { id: o.id, name: o.name, color: o.color }
}

function toSub(v: unknown): Sub | null {
  const o = v as Partial<Sub> | null
  if (
    !o ||
    !isStr(o.id) ||
    !isStr(o.name) ||
    !isNum(o.price) ||
    !CYCLES.includes(o.cycle as Sub['cycle'])
  )
    return null
  if (
    !isStr(o.next) ||
    !isStr(o.folderId) ||
    !isHex(o.color) ||
    !isStr(o.design) ||
    !isNum(o.seed)
  )
    return null
  return {
    id: o.id,
    name: o.name,
    price: o.price,
    cycle: o.cycle as Sub['cycle'],
    next: o.next,
    folderId: o.folderId,
    color: o.color,
    design: o.design,
    seed: o.seed,
    memo: isStr(o.memo) ? o.memo : '',
  }
}

/** 保存したデータを読む。無い・読めないときは空のデータを返す。形の合わない項目だけは捨てる */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    const o = raw ? (JSON.parse(raw) as Partial<AppData>) : null
    return {
      folders: Array.isArray(o?.folders)
        ? o.folders.map(toFolder).filter((f) => f !== null)
        : [],
      subs: Array.isArray(o?.subs)
        ? o.subs.map(toSub).filter((s) => s !== null)
        : [],
    }
  } catch {
    return { folders: [], subs: [] }
  }
}

/** JSON にしたデータを保存する。保存を禁止しているブラウザ（プライベートブラウズなど）では何もしない */
export function saveData(json: string) {
  try {
    localStorage.setItem(KEY, json)
  } catch {
    // 保存できなくても画面はそのまま使えるので、何もしない
  }
}
