// サブスクの追加・編集ダイアログ
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { artStyle, cardVars } from '../art/cardStyle'
import { DESIGNS } from '../art/designs'
import { useArt } from '../art/useArt'
import { CARD_COLORS, CYCLE_LABEL, CYCLES, UNSORTED, leastUsed } from '../model/constants'
import { nextDate, parsePrice, parseYMD, todayD, ymd } from '../model/format'
import type { Cycle, Folder, Sub } from '../model/types'
import { CardFront } from './CardFront'
import { IconShuffle } from './icons'
import { ModalDialog } from './ModalDialog'

/** ダイアログを開くたびに作る。token が変わるとフォームを作り直す */
export type SubDialogRequest = {
  token: number
  /** 編集するサブスク。null なら新規追加 */
  sub: Sub | null
  /** 新規追加のとき、最初に選んでおくフォルダ */
  folderId: string | null
}

export type SubFormValues = Omit<Sub, 'id'> & { id: string | null }

type Props = {
  open: boolean
  request: SubDialogRequest | null
  folders: Folder[]
  subs: Sub[]
  onCancel: () => void
  onSubmit: (values: SubFormValues) => void
}

export function SubDialog({ open, request, folders, subs, onCancel, onSubmit }: Props) {
  return (
    <ModalDialog open={open} onRequestClose={onCancel} labelledBy="subTitle">
      {request && <SubForm key={request.token} request={request} folders={folders} subs={subs} onSubmit={onSubmit} />}
    </ModalDialog>
  )
}

const newSeed = () => (Math.random() * 1e6) | 0

function SubForm({
  request,
  folders,
  subs,
  onSubmit,
}: {
  request: SubDialogRequest
  folders: Folder[]
  subs: Sub[]
  onSubmit: Props['onSubmit']
}) {
  const sub = request.sub
  const initialFolder = sub ? sub.folderId : request.folderId
  const [name, setName] = useState(sub?.name ?? '')
  const [price, setPrice] = useState(sub ? String(sub.price) : '')
  const [cycle, setCycle] = useState<Cycle>(sub?.cycle ?? 'month')
  const [next, setNext] = useState(() => ymd(sub ? nextDate(sub) : todayD()))
  const [folderId, setFolderId] = useState(
    folders.some((f) => f.id === initialFolder) ? (initialFolder as string) : (folders[0]?.id ?? ''),
  )
  const [color, setColor] = useState(
    () =>
      sub?.color ??
      leastUsed(
        CARD_COLORS.map(([c]) => c),
        subs.map((s) => s.color),
      ),
  )
  const [design, setDesign] = useState(
    () =>
      sub?.design ??
      leastUsed(
        DESIGNS.map((d) => d.id),
        subs.map((s) => s.design),
      ),
  )
  const [seed, setSeed] = useState(() => sub?.seed ?? newSeed())
  const [memo, setMemo] = useState(sub?.memo ?? '')
  const [error, setError] = useState('')
  const designsRef = useRef<HTMLDivElement>(null)
  const previewUrl = useArt(design, color, seed, 'l')

  // 選ばれている柄が見える位置まで、柄の一覧を横にスクロールしておく
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      designsRef.current
        ?.querySelector('input:checked')
        ?.closest('.dz')
        ?.scrollIntoView({ block: 'nearest', inline: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const parsedPrice = parsePrice(price)
  const previewNext = parseYMD(next) ? nextDate({ next, cycle }) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    const err = !n
      ? 'Enter a service name.'
      : parsedPrice === null
        ? 'Enter the price as a number.'
        : !parseYMD(next)
          ? 'Choose the next payment date.'
          : ''
    if (err || parsedPrice === null) {
      setError(err)
      return
    }
    onSubmit({
      id: sub?.id ?? null,
      name: n,
      price: parsedPrice,
      cycle,
      next,
      folderId,
      color,
      design,
      seed,
      memo: memo.trim().slice(0, 120),
    })
  }

  return (
    <form className="dlg-form" noValidate onSubmit={submit}>
      <h2 id="subTitle">{sub ? 'Edit subscription' : 'Add subscription'}</h2>
      <div
        className="fcard preview"
        aria-hidden="true"
        style={{ '--cw': '240px', '--ch': '151px', ...cardVars(color, design) } as CSSProperties}
      >
        <div className="fc-inner">
          <div className="face front" style={artStyle(color, previewUrl)}>
            <CardFront name={name.trim() || 'Service name'} price={parsedPrice} cycle={cycle} next={previewNext} />
          </div>
        </div>
      </div>

      <label className="field">
        <span>Service name</span>
        <input className="input" maxLength={40} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="row">
        <label className="field">
          <span>Price (JPY)</span>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Billing cycle</legend>
          <div className="opts">
            {CYCLES.map((c) => (
              <label key={c}>
                <input type="radio" name="cycle" value={c} checked={cycle === c} onChange={() => setCycle(c)} />
                <span>{CYCLE_LABEL[c]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="row">
        <label className="field">
          <span>Next payment</span>
          <input className="input" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="field">
          <span>Folder</span>
          <select className="input" value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            {folders.length ? (
              folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))
            ) : (
              <option value="">{UNSORTED.name}</option>
            )}
          </select>
        </label>
      </div>

      <div className="design-set">
        <div className="ds-head">
          <span className="ds-label" id="dsLabel">
            Design
          </span>
          <button className="shuffle" type="button" onClick={() => setSeed(newSeed())}>
            <IconShuffle />
            Shuffle
          </button>
        </div>
        <div className="designs" role="radiogroup" aria-labelledby="dsLabel" ref={designsRef}>
          {DESIGNS.map((d) => (
            <label className="dz" key={d.id}>
              <input
                type="radio"
                name="design"
                value={d.id}
                aria-label={d.name}
                checked={design === d.id}
                onChange={() => setDesign(d.id)}
              />
              <DesignThumb design={d.id} color={color} seed={seed} />
              <span className="dz-name">{d.name}</span>
            </label>
          ))}
        </div>
      </div>

      <fieldset>
        <legend>Color</legend>
        <div className="sw">
          {CARD_COLORS.map(([c, label]) => (
            <label key={c}>
              <input type="radio" name="color" value={c} aria-label={label} checked={color === c} onChange={() => setColor(c)} />
              <span style={{ '--c': c } as CSSProperties} />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Note (optional)</span>
        <textarea className="input" rows={2} maxLength={120} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>

      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="dlg-actions">
        <button className="btn ghost" type="button" data-close>
          Cancel
        </button>
        <button className="btn dark" type="submit">
          {sub ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  )
}

function DesignThumb({ design, color, seed }: { design: string; color: string; seed: number }) {
  const url = useArt(design, color, seed, 's')
  return <span className="dz-thumb" style={artStyle(color, url)} />
}
