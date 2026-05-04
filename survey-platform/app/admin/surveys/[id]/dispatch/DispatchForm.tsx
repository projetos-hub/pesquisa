'use client'

import { useState, useCallback, useEffect } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Community { id: string; nome: string }

interface SequenceStep {
  key:            string
  offsetDays:     number
  label:          string
  overrideTitle:  string
  overrideBody:   string
  customPerCh:    boolean
  pushTitle:      string
  pushBody:       string
  emailTitle:     string
  emailBody:      string
  emailLabel:     string
}

interface Props {
  surveyId:    string
  surveySlug:  string
  communities: Community[]  // instaladas nesta survey
  templates:   DispatchTemplate[]
  openDate:    string | null
  sampleCount: number        // emails resolvidos em survey_sample_lists
}

interface DispatchTemplate {
  id:                  string
  template_name:       string
  title:               string
  body:                string
  channels:            string[]
  target_scope:        string
  target_roles:        string[]
  push_title:          string | null
  push_body:           string | null
  email_title:         string | null
  email_body:          string | null
  email_action_label:  string | null
  email_background_url: string | null
}

const PLACEHOLDERS = ['{{nome}}', '{{nomeAluno}}', '{{nomeEscola}}', '{{serie}}']
const KNOWN_COMMUNITIES = [
  'americano','fwnash24','apogeu-santoantonio-i','apogeu-santoantonio-ii',
  'leonardodavinci-alfa','leonardodavinci-beta','leonardodavinci-gama',
  'globaltree-abm','matriz-bangu','matriz-campogrande','matriz-caxias',
  'matriz-madureira','matriz-novaiguacu','matriz-rochamiranda',
  'matriz-saojoaodemeriti','matriz-taquara','matriz-tijuca',
  'qi-freguesia','qi-metropolitano','qi-recreio','qi-rio2','qi-tijuca',
  'sarahdawsey-juizdefora','uniao','unificado-zonasul','raizeducacao',
]

function genKey() { return Math.random().toString(36).slice(2, 9) }

// ─── Component ────────────────────────────────────────────────────────────────

export default function DispatchForm({ surveyId, communities, templates, openDate, sampleCount }: Props) {
  // ── Targeting
  const [scope,        setScope]        = useState<'all' | 'communities' | 'group' | 'sample'>('all')
  const [selectedComms, setSelectedComms] = useState<string[]>([])
  const [groupAlias,   setGroupAlias]   = useState('')

  // Comunidades disponíveis na amostra (para segmentação por comunidade)
  interface SampleCommunity { community_id: string; nome: string; total: number; resolved: number }
  const [sampleComms,         setSampleComms]         = useState<SampleCommunity[]>([])
  const [selectedSampleComms, setSelectedSampleComms] = useState<string[]>([])

  useEffect(() => {
    if (scope !== 'sample') return
    fetch(`/api/admin/surveys/${surveyId}/sample/communities`)
      .then(r => r.json())
      .then((data: { communities?: SampleCommunity[] }) => setSampleComms(data.communities ?? []))
      .catch(() => setSampleComms([]))
  }, [scope, surveyId])
  const [groupComm,    setGroupComm]    = useState(communities[0]?.id ?? '')

  // Grupos de amostra
  interface SampleGroupOption { id: string; name: string; color: string; member_count: number }
  const [sampleGroups,        setSampleGroups]        = useState<SampleGroupOption[]>([])
  const [selectedSampleGroup, setSelectedSampleGroup] = useState<string>('')

  useEffect(() => {
    if (scope !== 'sample') return
    fetch(`/api/admin/surveys/${surveyId}/sample/groups`)
      .then(r => r.json())
      .then((d: { groups?: SampleGroupOption[] }) => setSampleGroups(d.groups ?? []))
      .catch(() => setSampleGroups([]))
  }, [scope, surveyId])
  const [roles,        setRoles]        = useState<string[]>(['guardian'])

  // ── Channels
  const [channels,     setChannels]     = useState<string[]>(['pushNotification', 'email'])

  // ── Message
  const [title,        setTitle]        = useState('')
  const [body,         setBody]         = useState('')
  const [customPerCh,  setCustomPerCh]  = useState(false)
  const [pushTitle,    setPushTitle]    = useState('')
  const [pushBody,     setPushBody]     = useState('')
  const [emailTitle,   setEmailTitle]   = useState('')
  const [emailBody,    setEmailBody]    = useState('')
  const [emailLabel,   setEmailLabel]   = useState('Responder Pesquisa')
  const [emailBgUrl,   setEmailBgUrl]   = useState('')
  const [importText,   setImportText]   = useState('')
  const [showImport,   setShowImport]   = useState(false)

  // ── Personalization
  const [personalized, setPersonalized] = useState(false)

  // ── Sequence (régua)
  const [seqMode,      setSeqMode]      = useState(false)
  const [steps,        setSteps]        = useState<SequenceStep[]>([
    { key: genKey(), offsetDays: 0,  label: 'Convite inicial', overrideTitle: '', overrideBody: '', customPerCh: false, pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '' },
    { key: genKey(), offsetDays: 7,  label: 'Lembrete',        overrideTitle: '', overrideBody: '', customPerCh: false, pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '' },
    { key: genKey(), offsetDays: 14, label: 'Aviso final',     overrideTitle: '', overrideBody: '', customPerCh: false, pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '' },
  ])

  // ── Schedule
  const [schedMode,    setSchedMode]    = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledAt,  setScheduledAt]  = useState('')

  // ── Template
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // ── Submit state
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<{ ok?: boolean; sent?: number; failed?: number; error?: string } | null>(null)

  // ── Preview
  const [preview, setPreview] = useState<{ community_count: number; personalized_estimate_min: number } | null>(null)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const toggleRole = (role: string) => {
    setRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])
  }

  const toggleChannel = (ch: string) => {
    setChannels(c => c.includes(ch) ? c.filter(x => x !== ch) : [...c, ch])
  }

  const applyImport = () => {
    const lines = importText.trim().split('\n').filter(Boolean)
    if (lines.length === 0) return
    if (lines.length === 1) {
      setBody(lines[0])
    } else {
      setTitle(lines[0])
      setBody(lines.slice(1).join('\n'))
    }
    setShowImport(false)
    setImportText('')
  }

  const loadTemplate = (tmpl: DispatchTemplate) => {
    setTitle(tmpl.title)
    setBody(tmpl.body)
    setChannels(tmpl.channels)
    setRoles(tmpl.target_roles)
    setScope(tmpl.target_scope as 'all' | 'communities' | 'group' | 'sample')
    if (tmpl.push_title) { setPushTitle(tmpl.push_title); setCustomPerCh(true) }
    if (tmpl.push_body)  { setPushBody(tmpl.push_body) }
    if (tmpl.email_title) { setEmailTitle(tmpl.email_title) }
    if (tmpl.email_body)  { setEmailBody(tmpl.email_body) }
    if (tmpl.email_action_label) setEmailLabel(tmpl.email_action_label)
    if (tmpl.email_background_url) setEmailBgUrl(tmpl.email_background_url)
  }

  const updateStep = useCallback((key: string, field: keyof SequenceStep, value: string | number | boolean) => {
    setSteps(s => s.map(st => st.key === key ? { ...st, [field]: value } : st))
  }, [])

  const addStep = () => setSteps(s => [...s, {
    key: genKey(), offsetDays: (s.at(-1)?.offsetDays ?? 0) + 7, label: 'Novo passo',
    overrideTitle: '', overrideBody: '', customPerCh: false,
    pushTitle: '', pushBody: '', emailTitle: '', emailBody: '', emailLabel: '',
  }])

  const removeStep = (key: string) => setSteps(s => s.filter(st => st.key !== key))

  const fetchPreview = async () => {
    const params = new URLSearchParams({ scope })
    if (scope === 'communities') params.set('communityIds', selectedComms.join(','))
    if (scope === 'group')       params.set('communityIds', groupComm)
    const res = await fetch(`/api/admin/surveys/${surveyId}/dispatch/preview?${params}`)
    if (res.ok) setPreview(await res.json() as typeof preview)
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (roles.length === 0)    { setResult({ error: 'Selecione ao menos um perfil' }); return }
    if (channels.length === 0) { setResult({ error: 'Selecione ao menos um canal' });  return }
    if (!title.trim())         { setResult({ error: 'Título é obrigatório' });          return }
    if (!body.trim())          { setResult({ error: 'Mensagem é obrigatória' });        return }

    setLoading(true)
    setResult(null)

    const basePayload = {
      title,
      body,
      channels,
      target_scope:         scope,
      target_community_ids: scope === 'all' ? null :
                            scope === 'sample' ? (selectedSampleComms.length > 0 ? selectedSampleComms : null) :
                            scope === 'group' ? [groupComm] : selectedComms,
      // Para sample scope, target_group_alias carrega o UUID do grupo selecionado
      target_group_alias:   scope === 'group' ? groupAlias :
                            scope === 'sample' && selectedSampleGroup ? selectedSampleGroup : null,
      target_roles:         roles,
      personalized,
      push_title:           customPerCh ? pushTitle : null,
      push_body:            customPerCh ? pushBody  : null,
      email_title:          customPerCh ? emailTitle : null,
      email_body:           customPerCh ? emailBody  : null,
      email_action_label:   emailLabel || null,
      email_background_url: emailBgUrl || null,
      save_as_template:     saveTemplate,
      template_name:        saveTemplate ? templateName : null,
    }

    try {
      if (!seqMode) {
        // ── Disparo único
        const scheduled = schedMode === 'scheduled' && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null

        const res = await fetch(`/api/admin/surveys/${surveyId}/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...basePayload, scheduled_at: scheduled }),
        })
        const data = await res.json() as { ok?: boolean; sent?: number; failed?: number; error?: string; scheduled?: boolean }
        if (data.scheduled) {
          setResult({ ok: true, sent: 0 })
        } else {
          setResult(data)
        }
      } else {
        // ── Régua: múltiplos disparos em sequência
        const sequenceId = crypto.randomUUID()
        const base = openDate ? new Date(openDate) : new Date()
        let allOk = true

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          const stepDate = new Date(base)
          stepDate.setDate(stepDate.getDate() + step.offsetDays)

          const res = await fetch(`/api/admin/surveys/${surveyId}/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...basePayload,
              title:        step.overrideTitle || title,
              body:         step.overrideBody  || body,
              // Per-step channel overrides — se o passo tem customPerCh, usa os seus próprios;
              // senão herda os valores globais do basePayload
              push_title:         step.customPerCh ? (step.pushTitle  || null) : basePayload.push_title,
              push_body:          step.customPerCh ? (step.pushBody   || null) : basePayload.push_body,
              email_title:        step.customPerCh ? (step.emailTitle || null) : basePayload.email_title,
              email_body:         step.customPerCh ? (step.emailBody  || null) : basePayload.email_body,
              email_action_label: step.customPerCh ? (step.emailLabel || emailLabel || null) : basePayload.email_action_label,
              scheduled_at:  stepDate.toISOString(),
              sequence_id:   sequenceId,
              sequence_step: i,
              save_as_template: saveTemplate,
              template_name:    saveTemplate ? (templateName ? `${templateName} — passo ${i + 1}` : null) : null,
            }),
          })
          const data = await res.json() as { ok?: boolean }
          if (!data.ok) { allOk = false; break }
        }
        setResult({ ok: allOk, sent: allOk ? steps.length : 0 })
      }
    } catch {
      setResult({ error: 'Erro de rede. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      {result?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {result.error}
        </div>
      )}
      {result?.ok && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
          {seqMode
            ? `✓ Régua criada com ${result.sent} disparos agendados`
            : result.sent === 0
              ? '✓ Disparo agendado com sucesso'
              : `✓ Enviado para ${result.sent} comunidade(s)${result.failed ? ` — ${result.failed} com falha` : ''}`
          }
        </div>
      )}

      {/* ── Template loader ───────────────────────────────────────────────── */}
      {templates.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Usar template
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={e => {
              const tmpl = templates.find(t => t.id === e.target.value)
              if (tmpl) loadTemplate(tmpl)
            }}
            defaultValue=""
          >
            <option value="">— Sem template —</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.template_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── 1. Quem recebe ────────────────────────────────────────────────── */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">1. Quem recebe</h3>

        {/* Scope */}
        <div className="flex gap-3 flex-wrap">
          {([
            ['all',         'Todas as comunidades'],
            ['communities', 'Comunidades específicas'],
            ['group',       'Uma turma'],
            ['sample',      '📊 Amostra'],
          ] as const).map(([val, label]) => (
            <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio" name="scope" value={val}
                checked={scope === val}
                onChange={() => {
                  setScope(val)
                  setPreview(null)
                  // Amostra requer modo personalizado
                  if (val === 'sample') setPersonalized(true)
                }}
                className="text-indigo-600"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Info de amostra + checklist de comunidades + seletor de grupo */}
        {scope === 'sample' && (
          <div className="space-y-2">
            <div className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-lg px-3 py-2">
              {sampleCount > 0
                ? `📋 ${sampleCount} email(s) resolvido(s) na amostra desta pesquisa.`
                : <>
                    ⚠️ Nenhum email resolvido na amostra.{' '}
                    <a href={`/admin/surveys/${surveyId}/sample`} className="underline font-medium">
                      Ir para Amostra →
                    </a>
                  </>
              }
            </div>

            {/* Checklist de comunidades da amostra */}
            {sampleComms.length > 1 && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700">Filtrar por comunidade</p>
                  <button
                    type="button"
                    onClick={() => setSelectedSampleComms([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {selectedSampleComms.length > 0 ? 'Limpar' : 'Todas'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {sampleComms.map(c => (
                    <label key={c.community_id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSampleComms.length === 0 || selectedSampleComms.includes(c.community_id)}
                        onChange={() => {
                          setSelectedSampleComms(prev => {
                            const all = prev.length === 0
                            if (all) return sampleComms.map(x => x.community_id).filter(x => x !== c.community_id)
                            return prev.includes(c.community_id)
                              ? prev.filter(x => x !== c.community_id)
                              : [...prev, c.community_id]
                          })
                        }}
                        className="text-indigo-600"
                      />
                      <span className="flex-1">{c.nome}</span>
                      <span className="text-gray-400">{c.resolved} resolvidos</span>
                    </label>
                  ))}
                </div>
                {selectedSampleComms.length > 0 && selectedSampleComms.length < sampleComms.length && (
                  <p className="text-xs text-amber-600">
                    Enviando para {selectedSampleComms.length} de {sampleComms.length} comunidade(s)
                  </p>
                )}
              </div>
            )}

            {/* Seletor de grupo */}
            {sampleGroups.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Grupo de destinatários <span className="text-gray-400">(opcional — vazio = toda a amostra)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSampleGroup('')}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      selectedSampleGroup === ''
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    Toda a amostra ({sampleCount})
                  </button>
                  {sampleGroups.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedSampleGroup(g.id === selectedSampleGroup ? '' : g.id)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                        selectedSampleGroup === g.id
                          ? 'text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                      style={selectedSampleGroup === g.id ? { background: g.color, borderColor: g.color } : {}}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                      {g.name} ({g.member_count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comunidades específicas */}
        {scope === 'communities' && (
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Comunidades selecionadas</label>
            <div className="flex gap-2 flex-wrap">
              {selectedComms.map(c => (
                <span key={c} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs rounded-full px-2.5 py-0.5 font-mono">
                  {c}
                  <button type="button" onClick={() => setSelectedComms(s => s.filter(x => x !== c))} className="hover:text-red-500">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                list="comm-list-specific"
                placeholder="ID da comunidade"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const val = (e.target as HTMLInputElement).value.trim()
                    if (val && !selectedComms.includes(val)) {
                      setSelectedComms(s => [...s, val])
                      setPreview(null)
                    }
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
              <datalist id="comm-list-specific">
                {[...new Set([...communities.map(c => c.id), ...KNOWN_COMMUNITIES])].map(c =>
                  <option key={c} value={c} />
                )}
              </datalist>
            </div>
            <p className="text-xs text-gray-400">Pressione Enter para adicionar.</p>
          </div>
        )}

        {/* Turma específica */}
        {scope === 'group' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Comunidade</label>
              <select
                value={groupComm}
                onChange={e => { setGroupComm(e.target.value); setPreview(null) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {communities.map(c => <option key={c.id} value={c.id}>{c.nome || c.id}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Alias da turma</label>
              <input
                value={groupAlias}
                onChange={e => setGroupAlias(e.target.value)}
                placeholder="ex: turma-3a"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Perfis */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Perfil dos destinatários</label>
          <div className="flex gap-4">
            {[['guardian', 'Responsáveis'], ['student', 'Alunos'], ['admin', 'Admins']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={roles.includes(val)} onChange={() => toggleRole(val)} className="rounded border-gray-300 text-indigo-600" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Preview de alcance */}
        <button
          type="button"
          onClick={fetchPreview}
          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
        >
          Estimar alcance
        </button>
        {preview && (
          <p className="text-xs text-gray-600 bg-indigo-50 rounded-lg px-3 py-2">
            {preview.community_count} comunidade(s) será(ão) notificada(s)
            {personalized && preview.personalized_estimate_min > 0
              ? ` · estimativa personalizado: ~${preview.personalized_estimate_min} min`
              : ''}
          </p>
        )}
      </section>

      {/* ── 2. Canais ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">2. Canais de envio</h3>
        <div className="flex gap-6">
          {[
            ['pushNotification', '📲 Push notification'],
            ['email',            '📧 Email'],
          ].map(([val, label]) => (
            <label key={val} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={channels.includes(val)} onChange={() => toggleChannel(val)} className="rounded border-gray-300 text-indigo-600" />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* ── 3. Mensagem ───────────────────────────────────────────────────── */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">3. Mensagem</h3>
          <button type="button" onClick={() => setShowImport(v => !v)} className="text-xs text-indigo-600 hover:underline">
            {showImport ? 'Fechar import' : '⬆ Importar texto'}
          </button>
        </div>

        {/* Import textarea */}
        {showImport && (
          <div className="space-y-2">
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={4}
              placeholder={'Cole seu texto aqui.\nPrimeira linha → título\nResto → corpo da mensagem'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <button
              type="button"
              onClick={applyImport}
              className="bg-indigo-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              Aplicar
            </button>
          </div>
        )}

        {/* Placeholders helper */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Placeholders:</span>
          {PLACEHOLDERS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setBody(b => b + p)}
              className="text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-600 rounded px-2 py-0.5 font-mono transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Título e corpo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={150}
            placeholder="Pesquisa de Satisfação — {{nomeEscola}}"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{title.length}/150</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem <span className="text-red-500">*</span></label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder="Ei, {{nome}}! Queremos ouvir sua opinião sobre a experiência de {{nomeAluno}} na escola."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Personalizar por canal */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={customPerCh} onChange={e => setCustomPerCh(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
          Personalizar mensagem por canal (push / email)
        </label>

        {customPerCh && (
          <div className="space-y-3 pl-4 border-l-2 border-indigo-100">
            {channels.includes('pushNotification') && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Push</p>
                <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="Título push (usa título geral se vazio)" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} rows={2} placeholder="Corpo push" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            {channels.includes('email') && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                <input value={emailTitle} onChange={e => setEmailTitle(e.target.value)} placeholder="Título email" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={2} placeholder="Corpo email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={emailLabel} onChange={e => setEmailLabel(e.target.value)} placeholder="Texto do botão CTA" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={emailBgUrl} onChange={e => setEmailBgUrl(e.target.value)} placeholder="URL imagem de fundo (opcional)" type="url" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
          </div>
        )}

        {/* Personalização por usuário */}
        <div className={`rounded-lg border p-3 space-y-2 ${personalized ? 'bg-amber-50 border-amber-200' : 'border-gray-200'}`}>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={personalized}
              onChange={e => { setPersonalized(e.target.checked); setPreview(null) }}
              className="rounded border-gray-300 text-indigo-600"
            />
            Personalizar por usuário (usar {'{{'} nome {'}}'},  {'{{'} nomeAluno {'}}'} , etc.)
          </label>
          {personalized && (
            <div className="text-xs text-amber-800 bg-amber-100 rounded-lg px-3 py-2 space-y-1">
              <p className="font-semibold">⚠️ Modo personalizado ativo</p>
              <p>Cada usuário recebe uma notificação individual com seu nome. O envio é feito em lotes de 30 a cada 5 minutos pelo sistema.</p>
              <p>Estimativa: ~150ms por usuário. O disparo continua em background mesmo após fechar o admin.</p>
              <p className="text-amber-700">Rate limit: se a Layers retornar erro 429, o sistema recua automaticamente e retoma no próximo ciclo.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Régua (sequência) ──────────────────────────────────────────── */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">4. Régua de disparos</h3>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={seqMode} onChange={e => setSeqMode(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
            Ativar régua
          </label>
        </div>

        {!seqMode && (
          <p className="text-xs text-gray-400">
            Régua permite criar uma sequência automática de mensagens ao longo da pesquisa (ex: convite, lembrete, aviso final).
          </p>
        )}

        {seqMode && (
          <div className="space-y-3">
            {openDate && (
              <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5">
                Base: abertura da pesquisa em {new Date(openDate).toLocaleDateString('pt-BR')}. Os dias são relativos a essa data.
              </p>
            )}
            {!openDate && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
                A pesquisa não tem data de abertura definida. Os dias serão relativos a agora.
              </p>
            )}

            {/* Timeline de passos */}
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={step.key} className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 p-3">
                  {/* Marcador */}
                  <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </div>
                    {i < steps.length - 1 && <div className="w-px h-6 bg-indigo-200" />}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        value={step.label}
                        onChange={e => updateStep(step.key, 'label', e.target.value)}
                        placeholder="Rótulo"
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-gray-500">Dia</span>
                        <input
                          type="number"
                          min={0}
                          value={step.offsetDays}
                          onChange={e => updateStep(step.key, 'offsetDays', Number(e.target.value))}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      {steps.length > 1 && (
                        <button type="button" onClick={() => removeStep(step.key)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
                      )}
                    </div>
                    <input
                      value={step.overrideTitle}
                      onChange={e => updateStep(step.key, 'overrideTitle', e.target.value)}
                      placeholder="Título específico (usa título geral se vazio)"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <textarea
                      value={step.overrideBody}
                      onChange={e => updateStep(step.key, 'overrideBody', e.target.value)}
                      rows={2}
                      placeholder="Mensagem específica (usa mensagem geral se vazio)"
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">Placeholders:</span>
                      {PLACEHOLDERS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateStep(step.key, 'overrideBody', (step.overrideBody || '') + p)}
                          className="text-xs bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-500 rounded px-1.5 py-0.5 font-mono transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Personalização por canal neste passo */}
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={step.customPerCh}
                        onChange={e => updateStep(step.key, 'customPerCh', e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      Personalizar push/email neste passo
                    </label>

                    {step.customPerCh && (
                      <div className="space-y-2 pl-3 border-l-2 border-indigo-100 mt-1">
                        {channels.includes('pushNotification') && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Push</p>
                            <input
                              value={step.pushTitle}
                              onChange={e => updateStep(step.key, 'pushTitle', e.target.value)}
                              placeholder="Título push (usa título do passo se vazio)"
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <textarea
                              value={step.pushBody}
                              onChange={e => updateStep(step.key, 'pushBody', e.target.value)}
                              rows={2}
                              placeholder="Corpo push"
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                        {channels.includes('email') && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</p>
                            <input
                              value={step.emailTitle}
                              onChange={e => updateStep(step.key, 'emailTitle', e.target.value)}
                              placeholder="Título email"
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <textarea
                              value={step.emailBody}
                              onChange={e => updateStep(step.key, 'emailBody', e.target.value)}
                              rows={2}
                              placeholder="Corpo email"
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                              value={step.emailLabel}
                              onChange={e => updateStep(step.key, 'emailLabel', e.target.value)}
                              placeholder="Texto do botão CTA"
                              className="w-full border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addStep}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Adicionar passo
            </button>
          </div>
        )}
      </section>

      {/* ── 5. Quando ─────────────────────────────────────────────────────── */}
      {!seqMode && (
        <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">5. Quando enviar</h3>
          <div className="flex gap-6">
            {([['immediate', 'Enviar agora'], ['scheduled', 'Agendar']] as const).map(([val, label]) => (
              <label key={val} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="schedMode" value={val} checked={schedMode === val} onChange={() => setSchedMode(val)} className="text-indigo-600" />
                {label}
              </label>
            ))}
          </div>
          {schedMode === 'scheduled' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </section>
      )}

      {/* ── 6. Salvar como template ───────────────────────────────────────── */}
      <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input type="checkbox" checked={saveTemplate} onChange={e => setSaveTemplate(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
          Salvar como template para reutilizar
        </label>
        {saveTemplate && (
          <input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Nome do template (ex: Convite CSAT 2026)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </section>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
        >
          {loading
            ? 'Enviando...'
            : seqMode
              ? `Criar régua com ${steps.length} passo(s)`
              : schedMode === 'scheduled'
                ? 'Agendar disparo'
                : 'Disparar agora'}
        </button>
      </div>
    </form>
  )
}
