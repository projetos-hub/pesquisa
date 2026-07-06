'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 8) {
      setError('Use uma senha com pelo menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas nao conferem.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError('Nao foi possivel atualizar a senha. Abra novamente o link recebido por e-mail.')
      setLoading(false)
      return
    }

    setMessage('Senha atualizada. Entrando no painel...')
    setTimeout(() => router.push('/admin/surveys'), 700)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b14] px-5 py-8 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/[0.12] bg-white p-6 text-slate-950 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-20 items-center border-r border-slate-200 pr-4">
            <Image src="/logo-raiz.png" alt="Raiz Educacao" width={96} height={58} priority className="h-12 w-auto object-contain" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f7941d]">Mini App Layers</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">Redefinir senha</h1>
          </div>
        </div>

        <p className="mb-5 text-sm leading-6 text-slate-600">
          Informe uma nova senha para continuar acessando o painel administrativo de pesquisas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Nova senha
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-[#f7941d] focus-within:ring-2 focus-within:ring-[#f7941d]/20">
              <span className="text-slate-400"><LockIcon /></span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="min-h-8 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Confirmar senha
            <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-[#f7941d] focus-within:ring-2 focus-within:ring-[#f7941d]/20">
              <span className="text-slate-400"><LockIcon /></span>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="min-h-8 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
              />
            </span>
          </label>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
          )}

          {message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#f7941d] px-4 text-sm font-black text-white transition hover:bg-[#d97b10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </form>
      </section>
    </main>
  )
}
