// サブスクフォルダの画面全体。画面にはフォルダだけを並べる。
// データを持ち、フォルダの開閉・ダイアログ・通知をまとめる。
// データはこの端末のブラウザ（localStorage）に保存する。初めて開いたときは空の状態で始まる。
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { AddFolderFab } from './components/AddFolderFab'
import { FolderDialog, type FolderDialogRequest } from './components/FolderDialog'
import { FolderTile } from './components/FolderGraphic'
import { SubDialog, type SubDialogRequest, type SubFormValues } from './components/SubDialog'
import { SummaryFab } from './components/SummaryFab'
import { Toast, type ToastMessage } from './components/Toast'
import { boxOf, dialogCloseMs, ensureRoom, lockScroll, popIn, useLatest, wait, type Box } from './dom'
import { FOLDER_COLORS, UNSORTED, leastUsed } from './model/constants'
import { sortByNext, uid } from './model/format'
import { loadData, saveData } from './model/storage'
import type { AppData, Folder, Sub } from './model/types'
import { FolderStage, type StageHandle } from './stage/FolderStage'
import { computeGeo, fanRoomAbove } from './stage/layout'
import './subscription-folder.css'

const EMPTY: Sub[] = []

export function SubscriptionFolderApp() {
  const [data, setData] = useState<AppData>(loadData)
  const dataRef = useLatest(data)

  // 中身が変わるたびに保存する。開いた直後は保存しない（読めなかった保存データを、すぐ空のデータで上書きしないため）
  const savedJson = useRef(JSON.stringify(data))
  useEffect(() => {
    const json = JSON.stringify(data)
    if (json === savedJson.current) return
    savedJson.current = json
    saveData(json)
  }, [data])

  const byFolder = useMemo(() => {
    const m = new Map<string, Sub[]>()
    data.folders.forEach((f) => m.set(f.id, sortByNext(data.subs.filter((s) => s.folderId === f.id))))
    return m
  }, [data])
  const byFolderRef = useLatest(byFolder)

  // ---- 開いているフォルダ ----
  const [openId, setOpenId] = useState<string | null>(null)
  const openRef = useLatest(openId)
  const [stageBox, setStageBox] = useState<Box | null>(null)
  const stageRef = useRef<StageHandle>(null)
  // 開閉のアニメーション中は、ほかの操作を受け付けない
  const anim = useRef(false)
  const isBusy = useCallback(() => anim.current, [])
  const folderEls = useRef(new Map<string, HTMLDivElement>())
  const registerFolder = (id: string) => (el: HTMLDivElement | null) => {
    if (el) folderEls.current.set(id, el)
    else folderEls.current.delete(id)
  }

  // 開いているフォルダが「元に戻す」などで消えたときは、消える直前の中身のままフェードアウトさせる
  const openFolder = openId ? data.folders.find((f) => f.id === openId) : undefined
  const stageContent = openFolder ? { folder: openFolder, subs: byFolder.get(openFolder.id) ?? EMPTY } : null
  const lastStage = useRef(stageContent)
  useLayoutEffect(() => {
    if (stageContent) lastStage.current = stageContent
  })
  const shownStage = stageContent ?? (openId ? lastStage.current : null)

  // ---- ダイアログと通知 ----
  const seq = useRef(0)
  const [subOpen, setSubOpen] = useState(false)
  const [subReq, setSubReq] = useState<SubDialogRequest | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderReq, setFolderReq] = useState<FolderDialogRequest | null>(null)
  const [toastMsg, setToastMsg] = useState<ToastMessage | null>(null)
  const toast = (text: string, undo?: () => void) => setToastMsg({ token: ++seq.current, text, undo })

  // ---- フォルダの開閉 ----
  async function openFolderById(id: string) {
    const f = dataRef.current.folders.find((x) => x.id === id)
    let src = folderEls.current.get(id)
    if (anim.current || !f || !src) return
    anim.current = true
    const n = Math.max(1, (byFolderRef.current.get(id) ?? EMPTY).length)
    await ensureRoom(src, fanRoomAbove(n, computeGeo(innerWidth)))
    src = folderEls.current.get(id) ?? src
    lockScroll(true)
    setStageBox(boxOf(src))
    setOpenId(id)
    anim.current = false
  }

  function finishClose(restoreFocus: boolean) {
    const id = openRef.current
    flushSync(() => {
      setOpenId(null)
      setStageBox(null)
    })
    lockScroll(false)
    if (restoreFocus && id) {
      folderEls.current.get(id)?.querySelector<HTMLButtonElement>('.f-hit')?.focus({ preventScroll: true })
    }
    anim.current = false
  }

  async function closeStage() {
    if (!openRef.current || anim.current) return
    anim.current = true
    await stageRef.current?.close()
    finishClose(true)
  }

  async function forceClose() {
    if (!openRef.current) return
    anim.current = true
    await stageRef.current?.fadeOut()
    finishClose(false)
  }

  useEffect(() => {
    if (openId && !openFolder && !anim.current) void forceClose()
  })

  /** 開いているフォルダの外をクリックした。別のフォルダの上なら、閉じてからそちらを開く */
  async function onBackdropClick(x: number, y: number) {
    let nextId: string | null = null
    for (const [id, el] of folderEls.current) {
      if (id === openRef.current) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        nextId = id
        break
      }
    }
    await closeStage()
    if (nextId) void openFolderById(nextId)
  }

  // ---- サブスクの追加・編集・削除 ----
  function openSubDialog(sub: Sub | null, folderId: string | null) {
    setSubReq({ token: ++seq.current, sub, folderId })
    setSubOpen(true)
  }

  // サブスクの追加と編集は、開いたフォルダの中からだけ行う
  async function submitSub(v: SubFormValues) {
    const stageId = openRef.current
    if (stageId) stageRef.current?.unfocus(true)
    setSubOpen(false)
    await wait(dialogCloseMs())

    const cur = dataRef.current
    let folders = cur.folders
    let folderId = v.folderId
    if (!folders.some((f) => f.id === folderId)) {
      const nf: Folder = { id: uid(), name: UNSORTED.name, color: UNSORTED.color }
      folders = [...folders, nf]
      folderId = nf.id
    }
    const { id, ...fields } = v
    const ex = id ? cur.subs.find((s) => s.id === id) : undefined
    let newId: string | null = null
    let subs: Sub[]
    if (ex) {
      subs = cur.subs.map((s) => (s.id === ex.id ? { ...s, ...fields, folderId } : s))
    } else {
      newId = uid()
      subs = [...cur.subs, { ...fields, id: newId, folderId }]
    }
    flushSync(() => setData({ ...cur, folders, subs }))

    // 開いているフォルダとは別のフォルダに入れたときは、どこに入れたかを知らせる
    if ((ex && ex.folderId !== folderId) || (newId && folderId !== stageId)) {
      const where = folders.find((x) => x.id === folderId)?.name ?? UNSORTED.name
      toast(ex ? `Moved “${v.name}” to ${where}` : `Added “${v.name}” to ${where}`)
    }
  }

  function deleteSub(id: string) {
    const prev = dataRef.current
    const s = prev.subs.find((x) => x.id === id)
    if (!s) return
    setData({ ...prev, subs: prev.subs.filter((x) => x.id !== id) })
    toast(`Deleted “${s.name}”`, () => setData(prev))
  }

  // ---- フォルダの作成・編集・削除 ----
  function openFolderDialog(folder: Folder | null) {
    const subCount = folder ? dataRef.current.subs.filter((s) => s.folderId === folder.id).length : 0
    setFolderReq({ token: ++seq.current, folder, subCount })
    setFolderOpen(true)
  }

  async function saveFolder(name: string) {
    const target = folderReq?.folder ?? null
    setFolderOpen(false)
    await wait(dialogCloseMs())
    const cur = dataRef.current
    if (target && cur.folders.some((f) => f.id === target.id)) {
      setData({ ...cur, folders: cur.folders.map((f) => (f.id === target.id ? { ...f, name } : f)) })
      return
    }
    const color = leastUsed(
      FOLDER_COLORS,
      cur.folders.map((f) => f.color),
    )
    const nf: Folder = { id: uid(), name, color }
    flushSync(() => setData({ ...cur, folders: [...cur.folders, nf] }))
    popIn(folderEls.current.get(nf.id))
  }

  async function deleteFolder() {
    const f = folderReq?.folder
    if (!f) return
    const prev = dataRef.current
    setData({
      ...prev,
      folders: prev.folders.filter((x) => x.id !== f.id),
      subs: prev.subs.filter((s) => s.folderId !== f.id),
    })
    setFolderOpen(false)
    await wait(dialogCloseMs())
    toast(`Deleted “${f.name}”`, () => setData(prev))
  }

  return (
    <>
      <div className="wrap" inert={!!openId}>
        {/* 画面にはフォルダだけを出す。見出しは読み上げ用 */}
        <h1 className="sr-only">Subscription Folders</h1>
        <main className="grid">
          {/* フォルダが無いときだけ、画面中央に一行の案内を出す */}
          {!data.folders.length && <p className="empty">Press + to create your first folder.</p>}
          {data.folders.map((f) => (
            <FolderTile
              key={f.id}
              folder={f}
              subs={byFolder.get(f.id) ?? EMPTY}
              hidden={f.id === openId}
              tileRef={registerFolder(f.id)}
              onOpen={() => void openFolderById(f.id)}
              onEdit={() => openFolderDialog(f)}
            />
          ))}
        </main>
      </div>

      {/* 画面下中央に並ぶ 2 つのボタン：支払いの合計（¥）とフォルダの作成（＋） */}
      <SummaryFab subs={data.subs} hidden={!!openId} />
      <AddFolderFab hidden={!!openId} onClick={() => openFolderDialog(null)} />

      {shownStage && stageBox && (
        <FolderStage
          ref={stageRef}
          folder={shownStage.folder}
          subs={shownStage.subs}
          initialBox={stageBox}
          getSourceBox={() => {
            const el = openRef.current ? folderEls.current.get(openRef.current) : undefined
            return el ? boxOf(el) : null
          }}
          isBusy={isBusy}
          dialogOpen={subOpen || folderOpen}
          onBackdropClick={(x, y) => void onBackdropClick(x, y)}
          onRequestClose={() => void closeStage()}
          onAdd={() => openSubDialog(null, openRef.current)}
          onEdit={(sub) => openSubDialog(sub, null)}
          onDelete={deleteSub}
        />
      )}

      <SubDialog
        open={subOpen}
        request={subReq}
        folders={data.folders}
        subs={data.subs}
        onCancel={() => setSubOpen(false)}
        onSubmit={(v) => void submitSub(v)}
      />
      <FolderDialog
        open={folderOpen}
        request={folderReq}
        onCancel={() => setFolderOpen(false)}
        onSave={(name) => void saveFolder(name)}
        onDelete={() => void deleteFolder()}
      />
      <Toast message={toastMsg} isBusy={isBusy} />
    </>
  )
}
