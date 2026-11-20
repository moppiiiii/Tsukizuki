import { cx } from '../dom'
// カード表面の中身（サービス名・周期・金額・次の支払日）
import { CYCLE_LABEL } from '../model/constants'
import { diffDays, dueLabel, shortDate, yen } from '../model/format'
import type { Cycle } from '../model/types'

type Props = {
  name: string
  /** null のときは「¥—」と出す（入力途中のプレビュー用） */
  price: number | null
  cycle: Cycle
  next: Date | null
}

export function CardFront({ name, price, cycle, next }: Props) {
  const days = next ? diffDays(next) : 0
  return (
    <>
      <span className="c-top">
        <span className="c-name">{name}</span>
        <span className="c-cycle">{CYCLE_LABEL[cycle]}</span>
      </span>
      <span className="c-bottom">
        <span className="c-price">{price == null ? '¥—' : yen(price)}</span>
        {next && (
          <span className={cx('c-due', days <= 3 && 'soon')}>
            <span>{shortDate(next)}</span>
            <span className="c-days">{dueLabel(days)}</span>
          </span>
        )}
      </span>
    </>
  )
}
