import { createFileRoute } from '@tanstack/react-router'
import { SubscriptionFolderApp } from '../features/subscription-folder/SubscriptionFolderApp'

export const Route = createFileRoute('/')({
  // ブラウザだけで描画する。カードの柄を canvas で描き、支払日を端末の「今日」から計算するため、
  // サーバー側で描くと日付のずれ（サーバーは UTC）や canvas の未対応で表示が食い違う
  ssr: false,
  component: SubscriptionFolderApp,
})
