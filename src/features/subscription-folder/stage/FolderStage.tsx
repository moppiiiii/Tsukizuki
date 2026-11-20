// フォルダを開いた状態の画面。
// 一覧のフォルダと同じ位置に複製を重ね、中のカードをポケットから扇状に取り出す。
// カードをタップすると手前に拡大し、もう一度タップすると裏返って詳細と操作が出る。
import {
  useImperativeHandle,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type Ref,
} from 'react'
import { flushSync } from 'react-dom'
import { artStyle, cardVars, toneOf } from '../art/cardStyle'
import { useArt } from '../art/useArt'
import { CardFront } from '../components/CardFront'
import { FolderBody } from '../components/FolderGraphic'
import { IconPlus, IconX } from '../components/icons'
import { cx, prefersReducedMotion, safeInsets, useLatest, wait, type Box } from '../dom'
import { CYCLE_LABEL } from '../model/constants'
import { diffDays, dueLabel, fullDate, monthlyOf, nextDate, yearlyOf, yen } from '../model/format'
import type { Folder, Sub } from '../model/types'
import { computeGeo, layoutFan, pocket, type Geo, type RestPos } from './layout'

export type StageHandle = {
  /** カードをポケットに戻してからフォルダを閉じる */
  close: () => Promise<void>
  /** カードを戻さず、画面ごとフェードアウトする（開いていたフォルダが消えたときなど） */
  fadeOut: () => Promise<void>
  /** 手前に拡大しているカードを扇に戻す */
  unfocus: (instant: boolean) => void
}

type Props = {
  folder: Folder
  subs: Sub[]
  /** 開く直前の、一覧上のフォルダの位置 */
  initialBox: Box
  /** 画面サイズが変わったときに、一覧上のフォルダの位置を取り直す */
  getSourceBox: () => Box | null
  isBusy: () => boolean
  dialogOpen: boolean
  /** カードが拡大されていないときに背景をクリックした。x, y は画面上の座標 */
  onBackdropClick: (x: number, y: number) => void
  onRequestClose: () => void
  onAdd: () => void
  onEdit: (sub: Sub) => void
  onDelete: (id: string) => void
  ref?: Ref<StageHandle>
}

/** 手前に拡大しているカード。x, y, k は移動先と拡大率 */
type Focus = { id: string; x: number; y: number; k: number }

/** 空のフォルダに出す「サブスクを追加」枠の id */
const SLOT = '__slot'

const posStyle = (p: RestPos, z: number): CSSProperties => ({
  translate: `${p.x}px ${p.y}px`,
  rotate: `${p.r}deg`,
  scale: '1',
  zIndex: z,
})
const restData = (p: RestPos) => ({ 'data-x': p.x, 'data-y': p.y, 'data-r': p.r })

export function FolderStage(props: Props) {
  const { folder, subs, initialBox, ref } = props
  const latest = useLatest(props)
  const stageRef = useRef<HTMLDivElement>(null)
  const sfRef = useRef<HTMLDivElement>(null)
  const fanRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const cardEls = useRef(new Map<string, HTMLElement>())
  const known = useRef<Set<string> | null>(null)
  const opened = useRef(false)
  const returnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [box, setBox] = useState(initialBox)
  const [vw, setVw] = useState(() => innerWidth)
  const geo = computeGeo(vw)
  const [active, setActive] = useState(false)
  const [peekHidden, setPeekHidden] = useState(false)
  const [focus, setFocus] = useState<Focus | null>(null)
  const [flipped, setFlipped] = useState<string | null>(null)
  // 扇に戻る途中のカード。戻りきるまで他のカードより手前に重ねておく
  const [returning, setReturning] = useState<string | null>(null)

  // 中身が変わったら（編集・削除・元に戻す）拡大と裏返しを解く
  const [prevSubs, setPrevSubs] = useState(subs)
  if (prevSubs !== subs) {
    setPrevSubs(subs)
    setFocus(null)
    setFlipped(null)
    setReturning(null)
  }

  const lay = layoutFan(Math.max(1, subs.length), box, geo, vw)
  const live = useLatest({ box, geo, focus })

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) cardEls.current.set(id, el)
    else cardEls.current.delete(id)
  }

  // ---- アニメーション ----
  function emerge(els: HTMLElement[], baseDelay: number, b: Box, g: Geo) {
    if (prefersReducedMotion() || !els.length) return
    const pk = pocket(b, g)
    const stag = Math.min(55, 420 / els.length)
    els.forEach((el, i) => {
      const x = +(el.dataset.x ?? 0)
      const y = +(el.dataset.y ?? 0)
      const r = +(el.dataset.r ?? 0)
      el.animate(
        [
          { translate: `${pk.x}px ${pk.y}px`, rotate: '0deg', scale: 0.32, easing: 'cubic-bezier(.3,.6,.4,1)' },
          {
            translate: `${pk.x + (x - pk.x) * 0.3}px ${-g.H * 0.55}px`,
            rotate: `${r * 0.4}deg`,
            scale: 0.62,
            offset: 0.36,
            easing: 'cubic-bezier(.25,1.3,.4,1)',
          },
          { translate: `${x}px ${y}px`, rotate: `${r}deg`, scale: 1 },
        ],
        { duration: 780, delay: baseDelay + i * stag, fill: 'backwards' },
      )
    })
  }

  async function retractAll() {
    const fan = fanRef.current
    if (!fan || prefersReducedMotion()) return
    const els = Array.from(fan.querySelectorAll<HTMLElement>('.fcard, .fslot'))
    if (!els.length) return
    const { box: b, geo: g } = live.current
    const pk = pocket(b, g)
    const n = els.length
    const stag = Math.min(40, 240 / n)
    await Promise.all(
      els.map((el, i) => {
        el.getAnimations().forEach((a) => a.finish())
        const x = +(el.dataset.x ?? 0)
        const y = +(el.dataset.y ?? 0)
        const r = +(el.dataset.r ?? 0)
        return el
          .animate(
            [
              { translate: `${x}px ${y}px`, rotate: `${r}deg`, scale: 1, opacity: 1, easing: 'cubic-bezier(.5,0,.7,.4)' },
              {
                translate: `${pk.x + (x - pk.x) * 0.3}px ${-g.H * 0.55}px`,
                rotate: `${r * 0.4}deg`,
                scale: 0.62,
                opacity: 1,
                offset: 0.5,
                easing: 'ease-in',
              },
              { translate: `${pk.x}px ${pk.y}px`, rotate: '0deg', scale: 0.32, opacity: 1 },
            ],
            { duration: 440, delay: (n - 1 - i) * stag, fill: 'forwards' },
          )
          .finished.catch(() => {})
      }),
    )
  }

  // 開いた直後：フォルダを「開いた」見た目に切り替え、少し沈ませる
  useLayoutEffect(() => {
    if (opened.current) return
    opened.current = true
    const sf = sfRef.current
    if (!sf) return
    void sf.offsetWidth // 切り替え前の見た目を一度確定させ、CSS の transition を効かせる
    setActive(true)
    setPeekHidden(true)
    if (!prefersReducedMotion()) {
      sf.animate([{ transform: 'scale(1)' }, { transform: 'scale(.96)', offset: 0.35 }, { transform: 'scale(1)' }], {
        duration: 440,
        easing: 'cubic-bezier(.3,1.4,.5,1)',
      })
    }
    closeRef.current?.focus({ preventScroll: true })
  }, [])

  // 新しく現れたカード（開いた直後は全部）をポケットから取り出す
  const ids = subs.length ? subs.map((s) => s.id) : [SLOT]
  const idsKey = ids.join('\n')
  useLayoutEffect(() => {
    const first = known.current === null
    const prev = known.current ?? new Set<string>()
    const fresh = ids.filter((id) => !prev.has(id))
    known.current = new Set(ids)
    const els = fresh.map((id) => cardEls.current.get(id)).filter((el): el is HTMLElement => !!el)
    emerge(els, first ? 40 : 0, box, geo)
    // ids は idsKey で比較している
  }, [idsKey])

  // ---- 拡大・裏返し ----
  function unfocus(instant: boolean) {
    const cur = live.current.focus
    if (!cur) return
    setFocus(null)
    setFlipped(null)
    clearTimeout(returnTimer.current)
    if (instant) {
      setReturning(null)
    } else {
      setReturning(cur.id)
      returnTimer.current = setTimeout(() => setReturning((r) => (r === cur.id ? null : r)), 560)
    }
  }

  function focusCard(id: string) {
    const prev = focus
    const ins = safeInsets()
    const top = 16 + ins.top
    const bottom = innerHeight - 16 - ins.bottom
    const k = Math.max(1, Math.min(Math.min(360, innerWidth * 0.86) / geo.W, ((bottom - top) * 0.62) / geo.H))
    const cy = top + (bottom - top) * 0.46
    clearTimeout(returnTimer.current)
    setReturning(prev && prev.id !== id ? prev.id : null)
    if (prev && prev.id !== id) {
      returnTimer.current = setTimeout(() => setReturning((r) => (r === prev.id ? null : r)), 560)
    }
    setFlipped(null)
    setFocus({
      id,
      x: Math.round(innerWidth / 2 - box.left - geo.W / 2),
      y: Math.round(cy - box.top - geo.H / 2),
      k,
    })
  }

  function flip(id: string, on: boolean) {
    const el = cardEls.current.get(id)
    if (on) {
      setFlipped(id)
      setTimeout(
        () => el?.querySelector<HTMLButtonElement>('[data-act="edit"]')?.focus({ preventScroll: true }),
        prefersReducedMotion() ? 0 : 280,
      )
    } else {
      // 表面の inert を外してからフォーカスを戻す
      flushSync(() => setFlipped(null))
      el?.querySelector<HTMLButtonElement>('.front')?.focus({ preventScroll: true })
    }
  }

  async function remove(id: string) {
    const el = cardEls.current.get(id)
    if (el && !prefersReducedMotion()) {
      const k = parseFloat(el.style.scale) || 1
      await el
        .animate([{ opacity: 1, scale: k }, { opacity: 0, scale: k * 0.85 }], {
          duration: 220,
          easing: 'ease-in',
          fill: 'forwards',
        })
        .finished.catch(() => {})
    }
    latest.current.onDelete(id)
  }

  const onCardClick = (e: MouseEvent, id: string) => {
    if (props.isBusy()) return
    if (focus?.id !== id) {
      focusCard(id)
      return
    }
    const t = e.target as Element
    if (t.closest('.front')) flip(id, true)
    else if (t.closest('.back')) flip(id, false)
  }

  const onAction = (e: MouseEvent, act: 'unflip' | 'edit' | 'delete', sub: Sub) => {
    e.stopPropagation()
    if (props.isBusy()) return
    if (act === 'unflip') flip(sub.id, false)
    else if (act === 'edit') props.onEdit(sub)
    else void remove(sub.id)
  }

  useImperativeHandle(ref, () => ({
    unfocus,
    async close() {
      flushSync(() => {
        setFocus(null)
        setFlipped(null)
        setReturning(null)
      })
      if (prefersReducedMotion()) return
      await retractAll()
      setPeekHidden(false)
      setActive(false)
      await wait(400)
    },
    async fadeOut() {
      const el = stageRef.current
      if (!el || prefersReducedMotion()) return
      await el
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' })
        .finished.catch(() => {})
    },
  }))

  // 画面サイズが変わったら、一覧上のフォルダの位置に合わせ直して並べ直す
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        const p = latest.current
        if (p.isBusy()) return
        unfocus(true)
        const b = p.getSourceBox()
        if (b) setBox(b)
        setVw(innerWidth)
      }, 140)
    }
    addEventListener('resize', onResize)
    return () => {
      removeEventListener('resize', onResize)
      clearTimeout(t)
    }
    // unfocus は live（最新の値）だけを読む
  }, [])

  // Esc：拡大中なら扇に戻し、そうでなければフォルダを閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const p = latest.current
      if (e.key !== 'Escape' || p.dialogOpen) return
      e.preventDefault()
      if (live.current.focus) unfocus(false)
      else p.onRequestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => clearTimeout(returnTimer.current), [])

  return (
    <div className="stage" ref={stageRef}>
      <div
        className={cx('dim', focus && 'veil')}
        onClick={(e) => {
          if (props.isBusy()) return
          if (focus) unfocus(false)
          else props.onBackdropClick(e.clientX, e.clientY)
        }}
      />
      <div
        className={cx('sf', active && 'active')}
        ref={sfRef}
        style={{ left: box.left, top: box.top, width: box.width, height: box.height, '--fc': folder.color } as CSSProperties}
      >
        <FolderBody name={folder.name} subs={subs} peekHidden={peekHidden} />
        <div
          className={cx('fan', focus && 'has-focus')}
          ref={fanRef}
          style={{ '--cw': `${geo.W}px`, '--ch': `${geo.H}px` } as CSSProperties}
        >
          {subs.map((s, i) => (
            <FanCard
              key={s.id}
              sub={s}
              rest={lay[i]}
              z={2 + i}
              focus={focus?.id === s.id ? focus : null}
              flipped={flipped === s.id}
              lifted={returning === s.id}
              cardRef={register(s.id)}
              onClick={(e) => onCardClick(e, s.id)}
              onAction={(e, act) => onAction(e, act, s)}
            />
          ))}
          {!subs.length && (
            <button
              type="button"
              className="fslot"
              ref={register(SLOT)}
              {...restData({ ...lay[0], r: 0 })}
              style={posStyle({ ...lay[0], r: 0 }, 2)}
              onClick={() => !props.isBusy() && props.onAdd()}
            >
              <IconPlus />
              Add subscription
            </button>
          )}
        </div>
        <button
          className="f-add"
          type="button"
          aria-label="Add a subscription to this folder"
          onClick={() => !props.isBusy() && props.onAdd()}
        >
          <IconPlus />
        </button>
        <button
          className="f-close"
          type="button"
          aria-label="Close folder"
          ref={closeRef}
          onClick={() => !props.isBusy() && props.onRequestClose()}
        >
          <IconX />
        </button>
      </div>
    </div>
  )
}

type CardProps = {
  sub: Sub
  rest: RestPos
  z: number
  focus: Focus | null
  flipped: boolean
  lifted: boolean
  cardRef: (el: HTMLElement | null) => void
  onClick: (e: MouseEvent) => void
  onAction: (e: MouseEvent, act: 'unflip' | 'edit' | 'delete') => void
}

function FanCard({ sub: s, rest, z, focus, flipped, lifted, cardRef, onClick, onAction }: CardProps) {
  const url = useArt(s.design, s.color, s.seed, 'l')
  const nd = nextDate(s)
  const label = `${s.name}, ${yen(s.price)} ${CYCLE_LABEL[s.cycle].toLowerCase()}, next payment ${fullDate(nd)}`
  const place: CSSProperties = focus
    ? { translate: `${focus.x}px ${focus.y}px`, rotate: '0deg', scale: focus.k.toFixed(3), zIndex: 300 }
    : posStyle(rest, lifted ? 300 : z)

  return (
    <div
      className={cx('fcard', focus && 'focused', flipped && 'flipped')}
      ref={cardRef}
      {...restData(rest)}
      style={{ ...cardVars(s.color, s.design), ...place }}
      onClick={onClick}
    >
      <div className="fc-inner">
        <button className="face front" type="button" style={artStyle(s.color, url)} aria-label={label} inert={flipped}>
          <CardFront name={s.name} price={s.price} cycle={s.cycle} next={nd} />
        </button>
        <div className="face back" style={artStyle(s.color, url, toneOf(s.design, s.color))} inert={!flipped}>
          <span className="stripe" aria-hidden="true" />
          <div className="b-body">
            <p className="b-line">
              <span>Next</span>
              <b>{fullDate(nd)}</b>
              <span>{dueLabel(diffDays(nd))}</span>
            </p>
            <p className="b-line">
              <span>Per month</span>
              <b>{yen(monthlyOf(s))}</b>
              <span>Per year</span>
              <b>{yen(yearlyOf(s))}</b>
            </p>
            {s.memo && <p className="b-memo">{s.memo}</p>}
          </div>
          <div className="b-actions">
            <button type="button" data-act="unflip" onClick={(e) => onAction(e, 'unflip')}>
              Flip back
            </button>
            <button type="button" data-act="edit" onClick={(e) => onAction(e, 'edit')}>
              Edit
            </button>
            <button type="button" data-act="delete" onClick={(e) => onAction(e, 'delete')}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
