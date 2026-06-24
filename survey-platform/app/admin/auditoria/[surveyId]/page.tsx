import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AdminPageShell } from '../../AdminPageShell'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'
import ExpectedResponsesEditor from './ExpectedResponsesEditor'

interface PageProps {
  params: Promise<{ surveyId: string }>
}

interface BroadcastRow {
  id: string
  fired_at: string
  channel: 'layers' | 'whatsapp' | 'email' | 'outro'
  community_ids: string[]
  notes: string | null
  fired_by: string | null
  respostas_apos_disparo: number
}

interface SchoolResponseRow {
  community_id: string
  nome_escola: string | null
  expected_responses: number | null
  total_respostas: number
  ultima_resposta: string | null
  taxa_pct: number | null
  saude: 'ok' | 'parcial' | 'critico' | 'sem_resposta' | 'sem_meta'
}

interface TimelinePoint {
  hora: string
  total: number
}

const CHANNEL_LABEL: Record<string, string> = {
  layers:   'Layers',
  whatsapp: 'WhatsApp',
  email:    'E-mail',
  outro:    'Outro',
}

const SAUDE_BADGE: Record<string, { label: string; cls: string }> = {
  ok:          { label: 'ok',         cls: 'bg-green-100 text-green-700' },
  parcial:     { label: 'parcial',    cls: 'bg-yellow-100 text-yellow-700' },
  critico:     { label: 'crítico',    cls: 'bg-red-100 text-red-700' },
  sem_resposta:{ label: 'sem resp.',  cls: 'bg-gray-100 text-gray-500' },
  sem_meta:    { label: 'sem meta',   cls: 'bg-gray-100 text-gray-400' },
}

function formatBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AuditoriaSurveyPage({ params }: PageProps) {
  const { surveyId } = await params

  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createServiceClient()

  // Survey básico
  const { data: survey } = await db
    .from('surveys')
    .select('id, title, slug, status')
    .eq('id', surveyId)
    .single()

  if (!survey) notFound()

  // Audit broadcasts ordenados por fired_at ASC (para correlação)
  const { data: broadcastsRaw } = await db
    .from('audit_broadcasts')
    .select('id, fired_at, channel, community_ids, notes, fired_by')
    .eq('survey_id', surveyId)
    .order('fired_at', { ascending: true })

  // Response sessions com submitted_at
  const { data: sessions } = await db
    .from('response_sessions')
    .select('id, community_id, submitted_at')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: true })

  const sessionList = sessions ?? []
  const rawBroadcasts = broadcastsRaw ?? []

  // Admin profiles para nomes dos disparadores
  const firedByIds = [...new Set(rawBroadcasts.map(b => b.fired_by).filter(Boolean))] as string[]
  const { data: adminProfiles } = firedByIds.length > 0
    ? await db
        .from('admin_profiles')
        .select('id, name, email')
        .in('id', firedByIds)
    : { data: [] }

  const profileMap = Object.fromEntries(
    (adminProfiles ?? []).map(p => [p.id, p.name ?? p.email])
  )

  // Calcula respostas após cada disparo (janela entre disparos consecutivos)
  const broadcasts: BroadcastRow[] = rawBroadcasts.map((b, idx) => {
    const nextBroadcast = rawBroadcasts[idx + 1]
    const windowStart = new Date(b.fired_at)
    const windowEnd = nextBroadcast ? new Date(nextBroadcast.fired_at) : new Date()

    const respostas_apos_disparo = sessionList.filter(s => {
      const at = new Date(s.submitted_at as string)
      if (at < windowStart || at >= windowEnd) return false
      const cids = b.community_ids as string[]
      if (cids.length === 0) return true
      return cids.includes(s.community_id as string)
    }).length

    return {
      id: b.id,
      fired_at: b.fired_at as string,
      channel: b.channel as BroadcastRow['channel'],
      community_ids: b.community_ids as string[],
      notes: b.notes as string | null,
      fired_by: profileMap[b.fired_by as string] ?? null,
      respostas_apos_disparo,
    }
  })

  // Inverte para exibir mais recente primeiro
  const broadcastsDesc = [...broadcasts].reverse()

  // Timeline por hora (BR timezone = UTC-3)
  const hourBuckets: Record<string, number> = {}
  for (const s of sessionList) {
    const dt = new Date(s.submitted_at as string)
    const brDate = new Date(dt.getTime() - 3 * 60 * 60 * 1000)
    const key = brDate.toISOString().slice(0, 13) + ':00:00.000Z' // truncado na hora
    hourBuckets[key] = (hourBuckets[key] ?? 0) + 1
  }

  const timeline: TimelinePoint[] = Object.entries(hourBuckets)
    .map(([hora, total]) => ({ hora, total }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  const maxTimeline = timeline.length > 0 ? Math.max(...timeline.map(t => t.total)) : 0

  // Comunidades com dados de resposta
  const { data: commData } = await db
    .from('survey_communities')
    .select('community_id, expected_responses')
    .eq('survey_id', surveyId)
    .eq('active', true)
    .order('community_id', { ascending: true })

  const communityIds = (commData ?? []).map(c => c.community_id)
  const { data: communityRows } = communityIds.length > 0
    ? await db
        .from('communities')
        .select('community_id, nome_escola')
        .in('community_id', communityIds)
    : { data: [] }
  const nameByCommunity = new Map((communityRows ?? []).map(c => [c.community_id, c.nome_escola ?? null]))

  const schools: SchoolResponseRow[] = (commData ?? []).map(c => {
    const nome_escola = nameByCommunity.get(c.community_id) ?? null
    const expected = c.expected_responses as number | null
    const commSessions = sessionList.filter(s => s.community_id === c.community_id)
    const total_respostas = commSessions.length
    const ultima_resposta = commSessions.length > 0
      ? commSessions.map(s => s.submitted_at as string).sort().at(-1) ?? null
      : null

    let taxa_pct: number | null = null
    let saude: SchoolResponseRow['saude'] = 'sem_meta'

    if (expected !== null && expected > 0) {
      taxa_pct = Math.round((total_respostas / expected) * 1000) / 10
      if (total_respostas === 0) saude = 'sem_resposta'
      else if (taxa_pct < 50) saude = 'critico'
      else if (taxa_pct < 80) saude = 'parcial'
      else saude = 'ok'
    } else if (expected === null) {
      saude = 'sem_meta'
    }

    return {
      community_id: c.community_id,
      nome_escola,
      expected_responses: expected,
      total_respostas,
      ultima_resposta,
      taxa_pct,
      saude,
    }
  })

  // Ordena por total_respostas DESC
  schools.sort((a, b) => b.total_respostas - a.total_respostas)

  // Nomes legíveis das comunidades para exibir nos disparos
  const commNameMap = Object.fromEntries(
    (commData ?? []).map(c => [c.community_id, nameByCommunity.get(c.community_id) ?? c.community_id])
  )

  return (
    <AdminPageShell active="auditoria" title="Auditoria">
      <div className="rounded-3xl border border-white/12 bg-[#12151d]/88 p-5 text-gray-900 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/auditoria" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Auditoria
        </Link>
        <span className="text-gray-300">/</span>
        <h2 className="text-lg font-semibold text-gray-900 truncate">{survey.title}</h2>
      </div>

      <div className="grid gap-6">
        {/* ── 1. Broadcasts Table ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Disparos registrados</h3>
            <Link
              href={`/admin/auditoria/${surveyId}/disparos/new`}
              className="bg-[#F7941D] text-white text-xs px-3 py-1.5 rounded-lg hover:bg-[#D97B10] transition-colors font-medium"
            >
              + Registrar disparo
            </Link>
          </div>

          {broadcastsDesc.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Data/hora</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Canal</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Comunidades</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Resp. após</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Quem disparou</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {broadcastsDesc.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatBR(b.fired_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {CHANNEL_LABEL[b.channel] ?? b.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">
                      {b.community_ids.length === 0
                        ? <span className="text-gray-400">Todas</span>
                        : b.community_ids
                            .slice(0, 2)
                            .map(cid => commNameMap[cid] ?? cid)
                            .join(', ')
                          + (b.community_ids.length > 2 ? ` +${b.community_ids.length - 2}` : '')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {b.respostas_apos_disparo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {b.fired_by ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                      {b.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Nenhum disparo registrado ainda.{' '}
              <Link
                href={`/admin/auditoria/${surveyId}/disparos/new`}
                className="text-[#F7941D] hover:underline"
              >
                Registrar o primeiro
              </Link>
            </div>
          )}
        </div>

        {/* ── 2. Response Timeline ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Timeline de respostas por hora
          </h3>

          {timeline.length > 0 ? (
            <div className="relative">
              {/* Barras */}
              <div className="flex items-end gap-0.5 h-32 overflow-x-auto pb-6">
                {timeline.map(point => {
                  const heightPct = maxTimeline > 0 ? (point.total / maxTimeline) * 100 : 0
                  const heightPx = Math.max(4, Math.round((heightPct / 100) * 112))

                  // Verifica se há disparo nesta hora
                  const hasBroadcast = broadcasts.some(b => {
                    const broadcastHour = new Date(b.fired_at).toISOString().slice(0, 13)
                    const pointHour = point.hora.slice(0, 13)
                    return broadcastHour === pointHour
                  })

                  return (
                    <div
                      key={point.hora}
                      className="flex flex-col items-center gap-0.5 min-w-[28px]"
                      title={`${formatHora(point.hora)} — ${point.total} respostas`}
                    >
                      <span className="text-[9px] text-gray-400">{point.total}</span>
                      <div
                        className={`w-5 rounded-sm transition-all ${hasBroadcast ? 'bg-[#F7941D]' : 'bg-blue-400'}`}
                        style={{ height: `${heightPx}px` }}
                      />
                      {hasBroadcast && (
                        <div className="w-1 h-1 rounded-full bg-[#F7941D]" title="Disparo nesta hora" />
                      )}
                      <span className="text-[9px] text-gray-400 rotate-45 origin-left mt-1">
                        {formatHora(point.hora)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-400" />
                  <span>Respostas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#F7941D]" />
                  <span>Hora com disparo</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhuma resposta registrada ainda.
            </p>
          )}
        </div>

        {/* ── 3. School Response Table ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Taxa de resposta por escola</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Edite o campo &quot;Esperado&quot; para definir a meta por escola.
            </p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Escola</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-2">Respostas</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Esperado</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Taxa</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Saúde</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2">Última resposta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schools.map(school => {
                const badge = SAUDE_BADGE[school.saude] ?? SAUDE_BADGE.sem_meta
                return (
                  <tr key={school.community_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900 text-xs">
                        {school.nome_escola ?? school.community_id}
                      </div>
                      {school.nome_escola && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {school.community_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {school.total_respostas}
                    </td>
                    <td className="px-4 py-2.5">
                      <ExpectedResponsesEditor
                        surveyId={surveyId}
                        communityId={school.community_id}
                        initialValue={school.expected_responses}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {school.taxa_pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                school.saude === 'ok' ? 'bg-green-500' :
                                school.saude === 'parcial' ? 'bg-yellow-400' :
                                school.saude === 'critico' ? 'bg-red-400' :
                                'bg-gray-300'
                              }`}
                              style={{ width: `${Math.min(school.taxa_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-700">{school.taxa_pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {school.ultima_resposta ? formatBR(school.ultima_resposta) : '—'}
                    </td>
                  </tr>
                )
              })}

              {schools.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    Nenhuma comunidade ativa para esta pesquisa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </AdminPageShell>
  )
}
