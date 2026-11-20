import { TanStackDevtools } from '@tanstack/react-devtools'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        // viewport-fit=cover：iPhone のノッチ周りまで描き、安全領域は CSS の env() で避ける
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Tsukizuki',
      },
      {
        name: 'description',
        content:
          'Sort your subscriptions into folders and see what you pay each month. Your data stays in this browser.',
      },
      // ブラウザにページの地の色（styles.css の --canvas と同じ色）を伝える。
      // Android の Chrome では、画面上部のアドレスバーがこの色になる。
      // 画面下のバー（ジェスチャーバー）にも効くかは、Chrome の公式説明に書かれていない
      {
        name: 'theme-color',
        content: '#EBEBEB',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // 黒い地に、フォルダからカードがのぞく絵。ICO には 16・32・48px の画像が入っている。
      // 白いフォルダは黒い地の上にあるので、明るいタブでも暗いタブでも見える
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
      },
      // iPhone は透明な部分を黒で埋めるので、こちらは隅まで黒く塗った四角い絵にしている
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      // ホーム画面にアプリとして追加したときの名前・開き方・色・アイコン。
      // display: standalone で、アドレスバーを出さずにアプリとして開く
      {
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
