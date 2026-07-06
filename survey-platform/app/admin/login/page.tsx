'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ACCESS_REQUEST_EMAIL = 'projetos@raizeducacao.com.br'

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15.5 7.5 1 1" />
      <path d="m19 4-9.5 9.5" />
      <circle cx="7.5" cy="16.5" r="4.5" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

    if (signInError) {
      setError('E-mail ou senha invalidos.')
    } else {
      router.push('/admin/surveys')
    }

    setLoading(false)
  }

  async function handleResetPassword() {
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Informe seu e-mail para receber o link de redefinicao.')
      return
    }

    setResetLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/admin/auth/callback?next=/admin/reset-password`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })

    if (resetError) {
      setError('Nao foi possivel enviar a redefinicao agora. Verifique o e-mail e tente novamente.')
    } else {
      setMessage('Enviamos um link de redefinicao para o e-mail informado.')
    }

    setResetLoading(false)
  }

  const accessRequestHref = `mailto:${ACCESS_REQUEST_EMAIL}?subject=${encodeURIComponent('Acesso ao Mini App Layers Pesquisa')}&body=${encodeURIComponent('Ola, preciso de acesso ao painel administrativo do Mini App Layers Pesquisa.\n\nNome:\nE-mail:\nMotivo do acesso:\n')}`

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div className="admin-login-ambient" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_440px] lg:px-8">
        <div className="max-w-2xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-20 items-center border-r border-white/15 pr-4">
              <Image src="/logo-raiz.png" alt="Raiz Educacao" width={96} height={58} priority className="h-12 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#f7941d]">Mini App Pesquisa</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Pesquisa</h1>
              <p className="mt-1 text-xs font-semibold text-slate-300">via app escolar Layers</p>
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.36em] text-[#5cc9bd]">Painel administrativo</p>
          <h2 className="mt-4 max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl">
            Gestao de pesquisas, disparos e respostas.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Configure pesquisas de satisfacao, gerencie disparos por comunidade, ajuste a identidade visual por escola e exporte respostas com links seguros.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <p className="font-black text-white">Pesquisas</p>
              <p className="mt-1 text-xs leading-5">Criacao e edicao de formularios.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <p className="font-black text-white">Disparos</p>
              <p className="mt-1 text-xs leading-5">Envio por push, e-mail e amostras.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <p className="font-black text-white">Exportacao</p>
              <p className="mt-1 text-xs leading-5">Links seguros e bases filtradas.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.12] bg-white p-5 text-slate-950 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-6">
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#f7941d]">Acesso restrito</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Entrar no admin</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use o e-mail autorizado pela Raiz e sua senha do painel.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">
              E-mail
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-[#f7941d] focus-within:ring-2 focus-within:ring-[#f7941d]/20">
                <span className="text-slate-400"><MailIcon /></span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="seu@email.com"
                  className="min-h-8 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Senha
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-[#f7941d] focus-within:ring-2 focus-within:ring-[#f7941d]/20">
                <span className="text-slate-400"><LockIcon /></span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua senha"
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyIcon />
              {resetLoading ? 'Enviando...' : 'Esqueci a senha'}
            </button>

            <a
              href={accessRequestHref}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5cc9bd]"
            >
              <MailIcon />
              Solicitar acesso
            </a>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            O acesso e liberado somente para perfis administrativos cadastrados. Se voce mudou de area ou precisa de outro escopo, solicite acesso pelo botao acima.
          </p>
        </div>
      </section>

      <style>{`
        .admin-login-ambient {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background:
            linear-gradient(115deg, rgba(8, 13, 25, 0.96) 0%, rgba(10, 13, 20, 0.9) 48%, rgba(35, 27, 10, 0.8) 100%),
            radial-gradient(900px 480px at 18% 12%, rgba(92, 201, 189, 0.18), transparent 58%),
            radial-gradient(760px 420px at 82% 4%, rgba(247, 148, 29, 0.20), transparent 56%),
            conic-gradient(from 150deg at 48% 34%, rgba(92, 201, 189, 0.16), rgba(247, 148, 29, 0.22), rgba(47, 109, 246, 0.16), rgba(92, 201, 189, 0.16));
          background-size: 100% 100%, 120% 120%, 125% 125%, 140% 140%;
          animation: admin-login-backdrop 18s ease-in-out infinite alternate;
        }

        .admin-login-ambient::before {
          content: "";
          position: absolute;
          inset: -42%;
          background:
            linear-gradient(90deg, transparent 0 46%, rgba(255,255,255,0.07) 50%, transparent 54%),
            linear-gradient(0deg, transparent 0 47%, rgba(247,148,29,0.08) 50%, transparent 53%);
          background-size: 280px 280px;
          filter: blur(18px);
          opacity: 0.55;
          transform: rotate(-9deg);
          animation: admin-login-field 12s ease-in-out infinite alternate;
        }

        .admin-login-ambient::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(247, 148, 29, 0.18), transparent 42%),
            linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.28) 100%);
          mix-blend-mode: screen;
          opacity: 0.62;
          animation: admin-login-glow 9s ease-in-out infinite alternate;
        }

        @keyframes admin-login-backdrop {
          from { background-position: 0% 50%, 16% 12%, 82% 4%, 42% 34%; filter: saturate(1); }
          to { background-position: 100% 50%, 26% 20%, 72% 12%, 58% 44%; filter: saturate(1.12); }
        }

        @keyframes admin-login-field {
          from { transform: translate3d(-4%, -2%, 0) rotate(-10deg) scale(1); }
          to { transform: translate3d(5%, 3%, 0) rotate(-5deg) scale(1.08); }
        }

        @keyframes admin-login-glow {
          from { opacity: 0.52; }
          to { opacity: 0.82; }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-login-ambient,
          .admin-login-ambient::before,
          .admin-login-ambient::after { animation: none; }
        }
      `}</style>
    </main>
  )
}
