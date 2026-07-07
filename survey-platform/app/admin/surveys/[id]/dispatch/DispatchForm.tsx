'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  createDefaultSequenceSteps,
  createNextSequenceStep,
  genKey,
  type DispatchFormProps,
  type DispatchPreview,
  type DispatchResultState,
  type DispatchScope,
  type DispatchTemplate,
  type SampleCommunity,
  type SampleGroupOption,
  type SequenceStep,
} from './dispatch-form-utils'
import { ChannelsSection, FinalOptionsSection, ResultFeedback, TemplateLoader } from './dispatch-form-parts'
import { MessageSection } from './dispatch-message-section'
import { SequenceSection } from './dispatch-sequence-section'
import { submitDispatchForm } from './dispatch-submit-handler'
import { TargetingSection } from './dispatch-targeting-section'

// ─── Tipos ────────────────────────────────────────────────────────────────────


// ─── Component ────────────────────────────────────────────────────────────────

export default function DispatchForm({ surveyId, communities, templates, openDate, sampleCount }: DispatchFormProps) {
  // ── Targeting
  const [scope,        setScope]        = useState<DispatchScope>('all')
  const [selectedComms, setSelectedComms] = useState<string[]>([])
  const [groupAlias,   setGroupAlias]   = useState('')

  // Comunidades disponíveis na amostra (para segmentação por comunidade)
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
  const [steps,        setSteps]        = useState<SequenceStep[]>(() => createDefaultSequenceSteps())

  // ── Schedule
  const [schedMode,    setSchedMode]    = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledAt,  setScheduledAt]  = useState('')

  // ── Template
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  // ── Submit state
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<DispatchResultState | null>(null)

  // ── Preview
  const [preview, setPreview] = useState<DispatchPreview | null>(null)

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
    if (tmpl.sequence_steps && tmpl.sequence_steps.length > 0) {
      setSteps(tmpl.sequence_steps.map(s => ({ ...s, key: genKey() } as SequenceStep)))
      setSeqMode(true)
    }
  }

  const updateStep = useCallback((key: string, field: keyof SequenceStep, value: string | number | boolean) => {
    setSteps(s => s.map(st => st.key === key ? { ...st, [field]: value } : st))
  }, [])

  const addStep = () => setSteps(s => [...s, createNextSequenceStep(s)])

  const removeStep = (key: string) => setSteps(s => s.filter(st => st.key !== key))

  const fetchPreview = async () => {
    const params = new URLSearchParams({ scope })
    if (scope === 'communities') params.set('communityIds', selectedComms.join(','))
    if (scope === 'group')       params.set('communityIds', groupComm)
    const res = await fetch(`/api/admin/surveys/${surveyId}/dispatch/preview?${params}`)
    if (res.ok) setPreview(await res.json() as typeof preview)
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = (event: React.FormEvent) => submitDispatchForm(event, {
    surveyId,
    openDate,
    roles,
    channels,
    title,
    body,
    scope,
    selectedComms,
    selectedSampleComms,
    groupComm,
    groupAlias,
    selectedSampleGroup,
    personalized,
    customPerCh,
    pushTitle,
    pushBody,
    emailTitle,
    emailBody,
    emailLabel,
    emailBgUrl,
    saveTemplate,
    templateName,
    seqMode,
    schedMode,
    scheduledAt,
    steps,
    setLoading,
    setResult,
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ResultFeedback result={result} seqMode={seqMode} />
      <TemplateLoader templates={templates} loadTemplate={loadTemplate} />
      <TargetingSection
        surveyId={surveyId}
        sampleCount={sampleCount}
        communities={communities}
        scope={scope}
        setScope={setScope}
        selectedComms={selectedComms}
        setSelectedComms={setSelectedComms}
        groupAlias={groupAlias}
        setGroupAlias={setGroupAlias}
        groupComm={groupComm}
        setGroupComm={setGroupComm}
        sampleComms={sampleComms}
        selectedSampleComms={selectedSampleComms}
        setSelectedSampleComms={setSelectedSampleComms}
        sampleGroups={sampleGroups}
        selectedSampleGroup={selectedSampleGroup}
        setSelectedSampleGroup={setSelectedSampleGroup}
        roles={roles}
        toggleRole={toggleRole}
        personalized={personalized}
        setPersonalized={setPersonalized}
        preview={preview}
        setPreview={setPreview}
        fetchPreview={fetchPreview}
      />

      <ChannelsSection channels={channels} toggleChannel={toggleChannel} />

      <MessageSection
        channels={channels}
        title={title}
        setTitle={setTitle}
        body={body}
        setBody={setBody}
        customPerCh={customPerCh}
        setCustomPerCh={setCustomPerCh}
        pushTitle={pushTitle}
        setPushTitle={setPushTitle}
        pushBody={pushBody}
        setPushBody={setPushBody}
        emailTitle={emailTitle}
        setEmailTitle={setEmailTitle}
        emailBody={emailBody}
        setEmailBody={setEmailBody}
        emailLabel={emailLabel}
        setEmailLabel={setEmailLabel}
        emailBgUrl={emailBgUrl}
        setEmailBgUrl={setEmailBgUrl}
        importText={importText}
        setImportText={setImportText}
        showImport={showImport}
        setShowImport={setShowImport}
        applyImport={applyImport}
        personalized={personalized}
        setPersonalized={setPersonalized}
        setPreview={setPreview}
      />

      <SequenceSection
        seqMode={seqMode}
        setSeqMode={setSeqMode}
        openDate={openDate}
        steps={steps}
        channels={channels}
        updateStep={updateStep}
        addStep={addStep}
        removeStep={removeStep}
      />

      <FinalOptionsSection
        seqMode={seqMode}
        schedMode={schedMode}
        setSchedMode={setSchedMode}
        scheduledAt={scheduledAt}
        setScheduledAt={setScheduledAt}
        saveTemplate={saveTemplate}
        setSaveTemplate={setSaveTemplate}
        templateName={templateName}
        setTemplateName={setTemplateName}
        loading={loading}
        stepsCount={steps.length}
      />

    </form>
  )
}
