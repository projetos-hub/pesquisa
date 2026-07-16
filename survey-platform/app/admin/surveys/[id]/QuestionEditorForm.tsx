'use client'

import type React from 'react'
import type { MutableRefObject } from 'react'

import type { QuestionFormActions, QuestionFormState, QuestionRow } from './useQuestionForm'
import { BRANCHABLE_TYPES, getBranchRouteOptions, HAS_OPTIONS, HAS_PERGUNTA, QUESTION_TYPES } from './question-editor-utils'
import { PlaceholderTextField } from '../../components/PlaceholderTextField'
import { TextAlignControl } from '../../components/TextAlignControl'

type QuestionForm = QuestionFormState & QuestionFormActions

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#F7941D]'
const sectionClass = 'rounded-xl border border-slate-200 bg-white p-4'
const mutedTextClass = 'text-xs text-slate-500'

interface QuestionEditorFormProps {
  isEdit: boolean
  form: QuestionForm
  questions: QuestionRow[]
  editingMetadataId: string | null
  optionRefs: MutableRefObject<(HTMLInputElement | null)[]>
  isPending: boolean
  canAdd: boolean
  onAdd: () => void
  onUpdateMetadata: () => void
  onReset: () => void
  onUpdateOption: (idx: number, val: string) => void
  onRemoveOption: (idx: number) => void
  onAddOptionRow: (focusIdx?: number) => void
  onOptionKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => void
}

interface FlowPath {
  id: string
  label: string
}

function routeLabel(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function collectFlowPaths(questions: QuestionRow[]): FlowPath[] {
  const paths = new Map<string, string>()

  for (const question of questions) {
    const blockId = routeLabel(question.settings?.flowBlockId, '')
    const blockLabel = routeLabel(question.settings?.flowBlockLabel, blockId)
    if (blockId) paths.set(blockId, blockLabel)

    const branchFlow = question.settings?.branchFlow as { routes?: { blockId?: string; blockLabel?: string }[] } | undefined
    for (const route of branchFlow?.routes ?? []) {
      const routeBlockId = routeLabel(route.blockId, '')
      if (routeBlockId) paths.set(routeBlockId, routeLabel(route.blockLabel, routeBlockId))
    }
  }

  return [...paths.entries()].map(([id, label]) => ({ id, label }))
}

function pathName(paths: FlowPath[], id: string) {
  if (!id) return 'Caminho principal'
  return paths.find(path => path.id === id)?.label || id
}

export function ThankYouEditorForm({ onReset }: { onReset: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5">
      <h4 className="m-0 text-sm font-semibold text-slate-800">Tela de agradecimento</h4>
      <p className="mb-4 mt-1 text-xs text-slate-500">
        A mensagem padrao e configurada em Configuracoes da pesquisa. Para mensagens por escola, use Comunidades e Identidade Visual.
      </p>
      <button onClick={onReset} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
        Fechar
      </button>
    </div>
  )
}

export function QuestionEditorForm({
  isEdit,
  form,
  questions,
  editingMetadataId,
  optionRefs,
  isPending,
  canAdd,
  onAdd,
  onUpdateMetadata,
  onReset,
  onUpdateOption,
  onRemoveOption,
  onAddOptionRow,
  onOptionKeyDown,
}: QuestionEditorFormProps) {
  const editingQuestion = questions.find(q => q.id === editingMetadataId)
  const optionLabels = isEdit ? editingQuestion?.options.map(o => o.label) || [] : form.formOptions.filter(o => o.trim())
  const branchRouteOptions = getBranchRouteOptions(form.formType, optionLabels)
  const flowPaths = collectFlowPaths(questions)
  const hasFlowConfig = Boolean(form.formFlowBlockId || form.formBranchEnabled)
  const hasAdvancedSettings = form.formType === 'text' || form.formType === 'file_upload' || form.formType === 'radio' || form.formType === 'scale' || form.formType === 'scale_sections'

  return (
    <div className={`mt-3 rounded-2xl border ${isEdit ? 'border-[#667eea]' : 'border-dashed border-[#667eea]'} bg-slate-50 p-4`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-base font-semibold text-slate-900">{isEdit ? 'Editar pergunta' : 'Nova pergunta'}</h4>
          <p className="mt-1 text-xs text-slate-500">Configure primeiro o que o respondente ve. Regras e fluxo ficam nas secoes recolhidas.</p>
        </div>
        {form.formKey && (
          <label className="flex items-center gap-2 text-xs text-slate-400">
            ID
            <input
              value={form.formKey}
              onChange={e => { form.setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); form.setKeyEdited(true) }}
              className="w-[18ch] rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
              title="Identificador tecnico gerado automaticamente"
            />
          </label>
        )}
      </div>

      <div className="grid gap-4">
        <section className={sectionClass}>
          <SectionTitle title="Pergunta" hint="O conteudo principal exibido para quem responde." />

          <div className="mt-3 grid gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {QUESTION_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => { form.setFormType(type.value); if (!isEdit) form.setFormOptions(['', '']) }}
                    className={`min-h-16 rounded-xl border px-3 py-2 text-left transition-colors ${
                      form.formType === type.value
                        ? 'border-[#667eea] bg-[#667eea]/10 text-[#553c9a]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold"><span aria-hidden="true" className="text-sm">{type.icon}</span>{type.label}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-slate-400">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <PlaceholderTextField
                label="Titulo exibido"
                value={form.formTitle}
                onChange={form.handleTitleChange}
                required
                placeholder="Ex: Voce pretende renovar a matricula?"
                className={inputClass}
              />
              <label className="flex w-fit items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.formRequired} onChange={event => form.setFormRequired(event.target.checked)} />
                Pergunta obrigatoria
              </label>
            </div>

            {HAS_PERGUNTA.has(form.formType) && (
              <PlaceholderTextField
                label="Texto da pergunta"
                value={form.formPergunta}
                onChange={form.setFormPergunta}
                placeholder="Ex: Como voce avalia a {tipo}?"
                className={inputClass}
              />
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <TextAlignControl value={form.formTextAlign} onChange={form.setFormTextAlign} label="Alinhamento do texto" />
            </div>
            <details className="group rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-600 group-open:mb-3">
                Descricao auxiliar opcional
              </summary>
              {form.formType === 'welcome' ? (
                <PlaceholderTextField
                  label="Texto de boas-vindas"
                  value={form.formDesc}
                  onChange={form.setFormDesc}
                  multiline
                  rows={4}
                  placeholder="Texto de boas-vindas (suporta {{nome}}, {{nomeAluno}}, {{serie}}, {{nomeEscola}})"
                  className={inputClass}
                />
              ) : (
                <PlaceholderTextField
                  label="Descricao"
                  value={form.formDesc}
                  onChange={form.setFormDesc}
                  placeholder="Instrucao ou contexto para o respondente"
                  className={inputClass}
                />
              )}
            </details>
          </div>
        </section>

        {(HAS_OPTIONS.has(form.formType) || form.formType === 'nps') && (
          <section className={sectionClass}>
            <SectionTitle title="Respostas" hint="Defina as escolhas que podem alimentar uma ramificacao." />

            {form.formType === 'nps' ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                NPS usa notas de 0 a 10. Essas notas podem direcionar caminhos diferentes na secao Fluxo.
              </div>
            ) : !isEdit && HAS_OPTIONS.has(form.formType) ? (
              <div className="mt-3 grid gap-2">
                {form.formOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-right text-xs text-slate-400">{idx + 1}.</span>
                    <input
                      ref={element => { optionRefs.current[idx] = element }}
                      value={option}
                      onChange={event => onUpdateOption(idx, event.target.value)}
                      onKeyDown={event => onOptionKeyDown(event, idx)}
                      placeholder={`Opcao ${idx + 1}`}
                      className={inputClass}
                    />
                    {form.formOptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveOption(idx)}
                        className="h-9 w-9 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                        title="Remover opcao"
                      >
                        x
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onAddOptionRow()}
                  className="mt-1 w-fit rounded-lg border border-dashed border-[#667eea] px-3 py-1.5 text-xs font-semibold text-[#667eea] hover:bg-[#667eea]/5"
                >
                  Adicionar opcao
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">As opcoes desta pergunta sao editadas no card da pergunta.</p>
            )}
          </section>
        )}

        {hasAdvancedSettings && (
        <details className={sectionClass}>
          <summary className="cursor-pointer list-none">
            <SectionTitle title="Avancado" hint="Ajustes especificos do tipo de pergunta." />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            {form.formType === 'text' && (
              <PlaceholderTextField
                label="Placeholder do campo"
                value={form.formPlaceholder}
                onChange={form.setFormPlaceholder}
                placeholder="Ex: Escreva sua sugestao aqui..."
                className={inputClass}
              />
            )}

            {form.formType === 'file_upload' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipos de arquivo aceitos</label>
                <input value={form.formAccept} onChange={event => form.setFormAccept(event.target.value)} placeholder=".pdf,.jpg,.png" className={inputClass} />
              </div>
            )}

            {(form.formType === 'scale' || form.formType === 'scale_sections') && (
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas da escala</label>
                  <input
                    value={form.formScaleValues}
                    onChange={event => form.setFormScaleValues(event.target.value)}
                    placeholder="Ex: 5,4,3,2,1"
                    className={inputClass}
                  />
                  <p className={mutedTextClass}>Informe na ordem em que os botoes devem aparecer.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Rotulo do maior valor</label>
                  <input
                    value={form.formScaleHighLabel}
                    onChange={event => form.setFormScaleHighLabel(event.target.value)}
                    placeholder="Ex: 5 - Otimo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Rotulo do menor valor</label>
                  <input
                    value={form.formScaleLowLabel}
                    onChange={event => form.setFormScaleLowLabel(event.target.value)}
                    placeholder="Ex: 1 - Pessimo"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {form.formType === 'radio' && (
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.formQuizMode} onChange={event => { form.setFormQuizMode(event.target.checked); if (!event.target.checked) form.setFormCorrectAnswer('') }} />
                  Modo quiz: esta pergunta tem uma resposta certa
                </label>

                {form.formQuizMode && branchRouteOptions.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-amber-900">Resposta correta</p>
                    <div className="grid gap-1">
                      {branchRouteOptions.map(option => (
                        <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="radio" name="correctAnswer" checked={form.formCorrectAnswer === option} onChange={() => form.setFormCorrectAnswer(option)} />
                          {option}
                        </label>
                      ))}
                    </div>
                    {form.formCorrectAnswer && (
                      <button type="button" onClick={() => form.setFormCorrectAnswer('')} className="mt-2 text-xs font-semibold text-red-600">
                        Limpar selecao
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </details>
        )}

        <details className={sectionClass} open={hasFlowConfig}>
          <summary className="cursor-pointer list-none">
            <SectionTitle title="Fluxo" hint="Use caminhos quando uma resposta deve abrir um ramo linear." />
          </summary>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Esta pergunta aparece em</label>
                <select
                  value={form.formFlowBlockId}
                  onChange={event => form.setFormFlowBlockId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Caminho principal</option>
                  {flowPaths.map(path => (
                    <option key={path.id} value={path.id}>{path.label}</option>
                  ))}
                  {form.formFlowBlockId && !flowPaths.some(path => path.id === form.formFlowBlockId) && (
                    <option value={form.formFlowBlockId}>{form.formFlowBlockId}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Criar ou renomear caminho</label>
                <input
                  value={form.formFlowBlockId}
                  onChange={event => form.setFormFlowBlockId(event.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, '-'))}
                  placeholder="ex: renovou"
                  className={inputClass}
                />
                <p className={mutedTextClass}>Deixe vazio para pergunta inicial ou comum.</p>
              </div>
            </div>

            {form.formFlowBlockId && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome interno do caminho</label>
                <input
                  value={form.formFlowBlockLabel}
                  onChange={event => form.setFormFlowBlockLabel(event.target.value)}
                  placeholder="Ex: Familias que renovaram"
                  className={inputClass}
                />
              </div>
            )}

            {BRANCHABLE_TYPES.has(form.formType) ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={form.formBranchEnabled} onChange={event => form.setFormBranchEnabled(event.target.checked)} />
                  Usar esta pergunta para escolher o proximo caminho
                </label>

                {form.formBranchEnabled && (
                  <div className="mt-3 grid gap-2">
                    {branchRouteOptions.length === 0 ? (
                      <p className="text-sm text-amber-700">Adicione opcoes de resposta antes de configurar os caminhos.</p>
                    ) : branchRouteOptions.map(option => (
                      <div key={option} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)] sm:items-center">
                        <span className="truncate text-sm font-medium text-slate-700">{option}</span>
                        <input
                          value={form.formBranchRoutes[option] ?? ''}
                          onChange={event => form.setFormBranchRoutes(prev => ({ ...prev, [option]: event.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, '-') }))}
                          placeholder="ex: renovou"
                          className={inputClass}
                          list="flow-paths"
                        />
                      </div>
                    ))}
                    <datalist id="flow-paths">
                      {flowPaths.map(path => <option key={path.id} value={path.id}>{path.label}</option>)}
                    </datalist>
                    <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      Exemplo: Sim - renovou, Nao - nao-renovou. Depois crie perguntas dentro desses caminhos.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Este tipo de pergunta pode pertencer a um caminho, mas nao cria ramificacao direta.
              </p>
            )}

            {hasFlowConfig && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                Resumo: esta pergunta aparece em {pathName(flowPaths, form.formFlowBlockId)}{form.formBranchEnabled ? ' e tambem direciona respostas para outros caminhos.' : '.'}
              </div>
            )}
          </div>
        </details>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={isEdit ? onUpdateMetadata : onAdd}
          disabled={isPending || !canAdd}
          className="rounded-lg bg-[#667eea] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isPending ? 'Salvando...' : (isEdit ? 'Atualizar pergunta' : 'Adicionar pergunta')}
        </button>
        <button type="button" onClick={onReset} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h5 className="m-0 text-sm font-semibold text-slate-900">{title}</h5>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  )
}