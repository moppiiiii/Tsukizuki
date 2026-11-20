export type Cycle = 'month' | 'year' | 'week'

export type Folder = {
  id: string
  name: string
  color: string
}

export type Sub = {
  id: string
  name: string
  /** 1 回の支払い額（円） */
  price: number
  cycle: Cycle
  /** 次の支払日（YYYY-MM-DD）。過ぎていれば周期から次回を計算する */
  next: string
  folderId: string
  /** カードの色味（16 進カラー） */
  color: string
  /** カードの柄の id（art/designs.ts） */
  design: string
  /** 柄の乱数シード。同じ柄でも見た目を変える */
  seed: number
  memo: string
}

export type AppData = {
  folders: Folder[]
  subs: Sub[]
}
