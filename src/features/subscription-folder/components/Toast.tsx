// 画面下に出る通知。削除のあとは「元に戻す」ボタンを付ける。6 秒で消える
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { prefersReducedMotion } from '../dom'

export type ToastMessage = {
  token: number
  text: string
  undo?: () => void
}

type Props = {
  message: ToastMessage | null
  /** アニメーション中は「元に戻す」を受け付けない */
  isBusy: () => boolean
}

export function Toast({ message, isBusy }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState<ToastMessage | null>(null)
  const current = useRef(0)

  const hide = useCallback((token: number) => {
    if (token !== current.current) return
    const el = ref.current
    const done = () => setShown((s) => (s && s.token === token ? null : s))
    if (!el || prefersReducedMotion()) {
      done()
      return
    }
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 160,
      fill: 'forwards',
    }).finished.then(
      () => {
        if (token === current.current) done()
      },
      () => {},
    )
  }, [])

  useEffect(() => {
    if (!message) return
    current.current = message.token
    setShown(message)
    const t = setTimeout(() => hide(message.token), 6000)
    return () => clearTimeout(t)
  }, [message, hide])

  const token = shown?.token
  useLayoutEffect(() => {
    const el = ref.current
    if (token === undefined || !el) return
    el.getAnimations().forEach((a) => a.cancel())
    if (prefersReducedMotion()) return
    el.animate(
      [
        { transform: 'translateY(16px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1)' },
    )
  }, [token])

  return (
    <div className="toast-wrap" aria-live="polite">
      {shown && (
        <div className="toast" ref={ref}>
          <span>{shown.text}</span>
          {shown.undo && (
            <button
              type="button"
              onClick={() => {
                const fn = shown.undo
                hide(shown.token)
                if (fn && !isBusy()) fn()
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
