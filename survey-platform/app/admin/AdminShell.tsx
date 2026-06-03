'use client'

import { usePathname } from 'next/navigation'

interface AdminShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AdminShell({ sidebar, children }: AdminShellProps) {
  const pathname = usePathname()

  // Home hub is fullscreen — no sidebar
  if (pathname === '/admin') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebar}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
