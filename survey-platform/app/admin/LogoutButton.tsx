'use client'

import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOutIcon } from '@/app/admin/icons'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-white/40 rounded-lg hover:bg-white/[0.08] hover:text-white/70 transition-all duration-150 cursor-pointer"
    >
      <LogOutIcon size={14} strokeWidth={1.75} />
      Sair
    </button>
  )
}
