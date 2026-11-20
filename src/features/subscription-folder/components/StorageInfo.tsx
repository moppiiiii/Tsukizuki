// 画面右上の「i」ボタン。押すと、データの保存先についての説明をボタンの下に開く。
// もう一度押すか、外側を押すか、Esc で閉じる。
import { useEffect, useRef, useState } from 'react'

import { cx } from '../dom'
import { IconInfo } from './icons'

type Props = {
  /** フォルダを開いている間は隠す */
  hidden: boolean
}

export function StorageInfo({ hidden }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  // フォルダを開いて隠れるときは、描画の途中で説明も閉じた状態に戻す
  const [wasHidden, setWasHidden] = useState(hidden)
  if (hidden !== wasHidden) {
    setWasHidden(hidden)
    if (hidden) setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className={cx('info', open && 'open', hidden && 'away')}
      ref={rootRef}
      inert={hidden}
    >
      <button
        className="info-btn"
        type="button"
        aria-label="About your data"
        aria-expanded={open}
        aria-controls="info-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <IconInfo />
      </button>
      <div className="info-panel" id="info-panel">
        <p className="info-lead">Your data is saved only in this browser.</p>
        <ul className="info-list">
          <li>It isn&rsquo;t shared with your other devices.</li>
          <li>Clearing your browser data deletes it.</li>
          <li>
            On iPhone, Safari may clear it after 7 days without a visit. Opening
            it from your Home Screen avoids this.
          </li>
        </ul>
      </div>
    </div>
  )
}
