// <dialog> をモーダルで開閉する。開くときと閉じるときにフェードとスライドをつける
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { dialogCloseMs, useLatest } from '../dom'

type Props = {
  open: boolean
  /** Esc・背景のクリック・data-close 付きのボタンで呼ばれる */
  onRequestClose: () => void
  labelledBy: string
  children: ReactNode
}

export function ModalDialog({
  open,
  onRequestClose,
  labelledBy,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [shown, setShown] = useState(false)
  const close = useLatest(onRequestClose)
  const isOpen = useLatest(open)

  // 閉じるときは、描画の途中で .in を外して閉じるアニメーションを始める
  if (!open && shown) setShown(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open) {
      if (!d.open) d.showModal()
      // 2 フレーム待ってから .in を付け、開くアニメーションを走らせる
      let r2 = 0
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(r1)
        cancelAnimationFrame(r2)
      }
    }
    if (!d.open) return
    const t = setTimeout(() => {
      if (d.open) d.close()
    }, dialogCloseMs())
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const onCancel = (e: Event) => {
      e.preventDefault()
      close.current()
    }
    // ブラウザが Esc の連打などで強制的に閉じた場合も、呼び出し側の状態を閉じるにそろえる
    const onClose = () => {
      if (isOpen.current) close.current()
    }
    d.addEventListener('cancel', onCancel)
    d.addEventListener('close', onClose)
    return () => {
      d.removeEventListener('cancel', onCancel)
      d.removeEventListener('close', onClose)
    }
  }, [close, isOpen])

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- 背景のクリックで閉じるための処理。キーボードでは Esc（cancel イベント）と data-close のボタンで閉じられる
    <dialog
      ref={ref}
      className={shown ? 'in' : undefined}
      aria-labelledby={labelledBy}
      onClick={(e) => {
        const t = e.target as Element
        if (t === e.currentTarget || t.closest('[data-close]')) close.current()
      }}
    >
      {children}
    </dialog>
  )
}
