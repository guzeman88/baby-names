import { type PropsWithChildren } from 'react'
import { ScrollViewStyleReset } from 'expo-router/html'

/**
 * Customises the static HTML document for web/PWA builds.
 * Expo Router renders this as the outermost shell on web only —
 * it has no effect on iOS/Android native builds.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Resets ScrollView body styles so the app fills the full viewport */}
        <ScrollViewStyleReset />

        {/* App metadata */}
        <title>Baby Names</title>
        <meta name="description" content="Discover the perfect name for your baby" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme colour for the browser chrome / Android task switcher */}
        <meta name="theme-color" content="#8B5CF6" />

        {/* iOS "Add to Home Screen" PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Baby Names" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
