// フォルダの作成・編集ダイアログ
import { useState, type FormEvent } from 'react'

import { cardCount } from '../model/format'
import type { Folder } from '../model/types'
import { ModalDialog } from './ModalDialog'

export type FolderDialogRequest = {
  token: number
  /** 編集するフォルダ。null なら新規作成 */
  folder: Folder | null
  /** フォルダに入っているサブスクの数（削除の確認に使う） */
  subCount: number
}

type Props = {
  open: boolean
  request: FolderDialogRequest | null
  onCancel: () => void
  onSave: (name: string) => void
  onDelete: () => void
}

export function FolderDialog({
  open,
  request,
  onCancel,
  onSave,
  onDelete,
}: Props) {
  return (
    <ModalDialog open={open} onRequestClose={onCancel} labelledBy="folderTitle">
      {request && (
        <FolderForm
          key={request.token}
          request={request}
          onSave={onSave}
          onDelete={onDelete}
        />
      )}
    </ModalDialog>
  )
}

function FolderForm({
  request,
  onSave,
  onDelete,
}: {
  request: FolderDialogRequest
  onSave: Props['onSave']
  onDelete: Props['onDelete']
}) {
  const { folder, subCount } = request
  const [name, setName] = useState(folder?.name ?? '')
  const [error, setError] = useState('')
  // 中にサブスクがあるときは、1 回目の「削除」で確認の文言に変え、2 回目で削除する
  const [armed, setArmed] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim().slice(0, 20)
    if (!n) {
      setError('Enter a folder name.')
      return
    }
    onSave(n)
  }

  const del = () => {
    if (subCount && !armed) {
      setArmed(true)
      return
    }
    onDelete()
  }

  return (
    <form className="dlg-form" noValidate onSubmit={submit}>
      <h2 id="folderTitle">{folder ? 'Edit folder' : 'New folder'}</h2>
      <label className="field">
        <span>Folder name</span>
        <input
          className="input"
          maxLength={20}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <div className="dlg-actions">
        {folder && (
          <button className="btn danger push" type="button" onClick={del}>
            {armed ? `Delete with ${cardCount(subCount)}` : 'Delete'}
          </button>
        )}
        <button className="btn ghost" type="button" data-close>
          Cancel
        </button>
        <button className="btn dark" type="submit">
          {folder ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  )
}
