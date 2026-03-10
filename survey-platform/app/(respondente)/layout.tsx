import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './survey.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Pesquisa de Satisfação',
}

export default function RespondentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.variable} survey-layout`}>
      {children}
    </div>
  )
}
