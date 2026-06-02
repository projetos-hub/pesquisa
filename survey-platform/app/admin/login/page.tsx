'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha inválidos.')
    } else {
      router.push('/admin/surveys')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={{ backgroundColor: '#F7941D' }}>
            <span className="text-white font-black text-xl">R</span>
          </div>
          <h1 className="text-xl font-semibold text-[#1A202C] tracking-tight">Área Admin</h1>
          <p className="text-sm text-[#718096] mt-1">Raiz Educação — Pesquisas CSAT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#4A5568] mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="seu@email.com"
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#1A202C] placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#F7941D] focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#4A5568] mb-1.5">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#1A202C] placeholder:text-[#718096] focus:outline-none focus:ring-2 focus:ring-[#F7941D] focus:border-transparent transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            style={{ backgroundColor: loading ? '#D97B10' : '#F7941D' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D97B10' }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F7941D' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
