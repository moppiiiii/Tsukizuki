// 画面下の「＋」ボタン。押すとフォルダ作成ダイアログを開く。
// マウスを乗せると ＋ が回り、上に「New folder」の吹き出しが出る。
import { cx } from '../dom'
import { IconPlus } from './icons'

type Props = {
  /** フォルダを開いている間は隠す */
  hidden: boolean
  onClick: () => void
}

export function AddFolderFab({ hidden, onClick }: Props) {
  return (
    <button
      className={cx('fab-add', hidden && 'away')}
      type="button"
      aria-label="New folder"
      inert={hidden}
      onClick={onClick}
    >
      <IconPlus />
      <span className="fab-tip" aria-hidden="true">
        New folder
      </span>
    </button>
  )
}
