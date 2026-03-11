import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './survey.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Pesquisa de Satisfação',
}

const LAYERS_APP_ID = process.env.NEXT_PUBLIC_LAYERS_APP_ID ?? ''

export default function RespondentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.variable} survey-layout`}>
      {LAYERS_APP_ID && (
        <>
          <Script id="layers-portal-options" strategy="beforeInteractive">
            {`window.LayersPortalOptions = { appId: '${LAYERS_APP_ID}', insidePortalOnly: false };`}
          </Script>
          <Script
            src="https://js.layers.digital/v1/LayersPortal.js"
            strategy="beforeInteractive"
          />
        </>
      )}
      {children}
    </div>
  )
}
