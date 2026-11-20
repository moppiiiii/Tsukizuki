// フォルダの絵（背面・のぞいているカード・半透明の前面・ラベル）と、一覧に並ぶフォルダ
import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type Ref,
} from 'react'

import { artStyle } from '../art/cardStyle'
import { useArt } from '../art/useArt'
import { canTilt } from '../dom'
import { cardCount, monthlyOf, yen } from '../model/format'
import type { Folder, Sub } from '../model/types'
import { IconDots } from './icons'

const BACK_EDGE_D =
  'M0.6 42Q0.6 30.6 12 30.6L104 30.6C116 30.6 118 12.6 132 12.6L188 12.6Q199.4 12.6 199.4 24'
const EDGE_D =
  'M0.6 70Q0.6 58.6 12 58.6L64 58.6C78 58.6 82 74.6 96 74.6L188 74.6Q199.4 74.6 199.4 86'

/** フォルダからのぞくカード 3 枚の位置（% と回転角） */
const PEEK = [
  { l: 10, t: 13, w: 76, h: 62, r: -3.5 },
  { l: 15, t: 18, w: 76, h: 62, r: 2.5 },
  { l: 6, t: 23, w: 88, h: 66, r: -0.8 },
]

const monthlyTotal = (subs: Sub[]) => subs.reduce((a, s) => a + monthlyOf(s), 0)

export function countLabel(subs: Sub[]) {
  if (!subs.length) return 'Empty'
  return `${cardCount(subs.length)} · ${yen(monthlyTotal(subs))}/mo`
}

function PeekCard({ sub, i }: { sub: Sub; i: number }) {
  const url = useArt(sub.design, sub.color, sub.seed, 'l')
  const p = PEEK[i]
  const style = {
    ...artStyle(sub.color, url),
    left: `${p.l}%`,
    top: `${p.t}%`,
    width: `${p.w}%`,
    height: `${p.h}%`,
    '--r': `${p.r}deg`,
    '--i': i,
  } as CSSProperties
  return <i style={style} />
}

type BodyProps = {
  name: string
  subs: Sub[]
  /** 開いている間はのぞいているカードを隠す（カードが扇状に出ているため） */
  peekHidden?: boolean
  bodyRef?: Ref<HTMLDivElement>
}

export function FolderBody({ name, subs, peekHidden, bodyRef }: BodyProps) {
  return (
    <div className="f-body" aria-hidden="true" ref={bodyRef}>
      <span className="f-shadow" />
      <span className="f-back" />
      <span className="f-back-act" />
      <svg
        className="f-edge back-edge"
        viewBox="0 0 200 150"
        preserveAspectRatio="none"
      >
        <path d={BACK_EDGE_D} />
      </svg>
      <span className="f-peek" style={peekHidden ? { opacity: 0 } : undefined}>
        {subs.slice(0, 3).map((s, i) => (
          <PeekCard key={s.id} sub={s} i={i} />
        ))}
      </span>
      <span className="f-front" />
      <span className="f-dark" />
      <svg className="f-edge" viewBox="0 0 200 150" preserveAspectRatio="none">
        <path d={EDGE_D} />
      </svg>
      <span className="f-label">
        <span className="f-name">{name}</span>
        <span className="f-count">{countLabel(subs)}</span>
      </span>
    </div>
  )
}

type TileProps = {
  folder: Folder
  subs: Sub[]
  /** 開いている最中は一覧側を隠し、開いたフォルダだけを見せる */
  hidden: boolean
  tileRef: Ref<HTMLDivElement>
  onOpen: () => void
  onEdit: () => void
}

export function FolderTile({
  folder,
  subs,
  hidden,
  tileRef,
  onOpen,
  onEdit,
}: TileProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tilt] = useState(canTilt)
  const m = monthlyTotal(subs)
  const label = subs.length
    ? `Open ${folder.name}: ${cardCount(subs.length)}, ${yen(m)} per month`
    : `Open ${folder.name}: empty folder`

  // ポインタの位置に合わせてフォルダを少し傾ける（再描画を避けて style を直接書き換える）
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const t = bodyRef.current
    if (!t) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    t.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg')
    t.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg')
    t.classList.add('tilting')
  }
  const onPointerLeave = () => {
    const t = bodyRef.current
    if (!t) return
    t.classList.remove('tilting')
    t.style.removeProperty('--rx')
    t.style.removeProperty('--ry')
  }

  return (
    <div
      className="folder"
      ref={tileRef}
      style={
        {
          '--fc': folder.color,
          visibility: hidden ? 'hidden' : undefined,
        } as CSSProperties
      }
      onPointerMove={tilt ? onPointerMove : undefined}
      onPointerLeave={tilt ? onPointerLeave : undefined}
    >
      <button
        className="f-hit"
        type="button"
        aria-label={label}
        onClick={onOpen}
      />
      <FolderBody name={folder.name} subs={subs} bodyRef={bodyRef} />
      <button
        className="f-more"
        type="button"
        aria-label={`Edit ${folder.name}`}
        onClick={onEdit}
      >
        <IconDots />
      </button>
    </div>
  )
}
