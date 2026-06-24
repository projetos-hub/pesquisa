'use client'

import { useState } from 'react'
import type { ScaleStepDef } from '../utils/types'
import ScaleRow from '../../ui/ScaleRow'

interface StepEscalaProps {
  step: ScaleStepDef
  tipo: string
  onNext: (data: Record<string, unknown>) => void
  onBack: () => void
  isLast: boolean
  loading: boolean
}

export default function StepEscala({ step, tipo, onNext, onBack, isLast, loading }: StepEscalaProps) {
  const resolve = (l: string) => l.replace(/\{tipo\}/g, tipo)
  const textAlign = step.textAlign ?? 'left'

  const [simpleRatings, setSimpleRatings] = useState<Record<number, number>>({})
  const [sectionRatings, setSectionRatings] = useState<Record<string, Record<number, number>>>({})
  const [tentou, setTentou] = useState(false)

  // ── Escala com seções (bilíngue) ────────────────────────────────────────────
  if (step.secoes) {
    const allOk = step.secoes.every(sec =>
      sec.perguntas.every((_, i) => sectionRatings[sec.key]?.[i] != null)
    )
    const pendentes = step.secoes.reduce((n, sec) =>
      n + sec.perguntas.filter((_, i) => sectionRatings[sec.key]?.[i] == null).length, 0
    )
    const buildAns = () =>
      step.secoes!.reduce<Record<string, unknown>>((acc, sec) => ({
        ...acc,
        [sec.key]: { ...(sectionRatings[sec.key] || {}) },
      }), {})

    function handleNext() {
      if (!allOk) { setTentou(true); return }
      onNext(buildAns())
    }

    return (
      <div>
        <p className="step-title" style={{ textAlign }}>{step.titulo}</p>
        {step.desc && <p className="step-desc" style={{ textAlign }}>{step.desc}</p>}
        {step.secoes.map(sec => (
          <div key={sec.key}>
            <p className="section-div">{sec.titulo}</p>
            {sec.perguntas.map((l, i) => (
              <ScaleRow
                key={i}
                label={resolve(l)}
                value={sectionRatings[sec.key]?.[i]}
                highlight={tentou && sectionRatings[sec.key]?.[i] == null}
                onChange={v =>
                  setSectionRatings(p => ({
                    ...p,
                    [sec.key]: { ...(p[sec.key] || {}), [i]: v },
                  }))
                }
              />
            ))}
          </div>
        ))}
        {tentou && !allOk && (
          <p role="alert" style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8 }}>
            ⚠️ Avalie {pendentes === 1 ? 'o item marcado' : `os ${pendentes} itens marcados`} em vermelho para continuar.
          </p>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onBack}>← Voltar</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            style={!allOk && !loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
            onClick={handleNext}
          >
            {loading ? 'Enviando…' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Lista simples de perguntas ──────────────────────────────────────────────
  const perguntas = (step.perguntas || []).map(resolve)
  const ok = perguntas.every((_, i) => simpleRatings[i] != null)
  const pendentesSimples = perguntas.filter((_, i) => simpleRatings[i] == null).length
  const buildAns = () =>
    perguntas.reduce<Record<string, unknown>>((a, _l, i) => ({ ...a, [String(i)]: simpleRatings[i] }), {})

  function handleNextSimple() {
    if (!ok) { setTentou(true); return }
    onNext(buildAns())
  }

  return (
    <div>
      <p className="step-title" style={{ textAlign }}>{step.titulo}</p>
      {step.desc && <p className="step-desc" style={{ textAlign }}>{step.desc}</p>}
      {perguntas.map((l, i) => (
        <ScaleRow
          key={i}
          label={l}
          value={simpleRatings[i]}
          highlight={tentou && simpleRatings[i] == null}
          onChange={v => setSimpleRatings(p => ({ ...p, [i]: v }))}
        />
      ))}
      {tentou && !ok && (
        <p role="alert" style={{ color: '#e53e3e', fontSize: '.85rem', marginBottom: 8, textAlign: 'right' }}>
          ⚠️ Avalie {pendentesSimples === 1 ? 'o item marcado' : `os ${pendentesSimples} itens marcados`} em vermelho para continuar.
        </p>
      )}
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading}
          style={!ok && !loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          onClick={handleNextSimple}
        >
          {loading ? 'Enviando…' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
        </button>
      </div>
    </div>
  )
}
