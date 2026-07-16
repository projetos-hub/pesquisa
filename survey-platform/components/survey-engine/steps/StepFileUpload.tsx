'use client'

import { useRef, useState } from 'react'
import type { FileUploadStepDef } from '../utils/types'
import { textAlignClassName, textAlignStyle } from '../utils/textAlign'

interface StepFileUploadProps {
  step: FileUploadStepDef
  tipo: string
  onNext: (data: { name: string; url: string; size: number }) => void
  onBack: () => void
  isLast: boolean
  loading: boolean
}

export default function StepFileUpload({ step, tipo, onNext, onBack, isLast, loading }: StepFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resolve = (l: string) => l.replace(/\{tipo\}/g, tipo)
  const textAlign = step.textAlign ?? 'left'
  const alignStyle = textAlignStyle(textAlign)
  const alignClassName = textAlignClassName(textAlign)

  const ok = !step.obrigatorio || file !== null

  async function handleNext() {
    if (!ok) { setTentou(true); return }
    if (!file) { onNext({ name: '', url: '', size: 0 }); return }

    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Falha no upload')
      const { url } = await res.json() as { url: string }
      onNext({ name: file.name, url, size: file.size })
    } catch {
      setUploadError('Erro ao enviar o arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={alignClassName}>
      {!step.hideTitle && <p className="step-title" style={alignStyle}>{step.titulo}</p>}
      {step.desc && <p className="step-desc" style={alignStyle}>{step.desc}</p>}
      <div className="q-group">
        <p className="question-label" style={alignStyle}>{resolve(step.pergunta)}</p>
        <div
          role="button"
          tabIndex={0}
          aria-label={file ? `Arquivo selecionado: ${file.name}` : 'Selecionar arquivo'}
          style={{
            border: '2px dashed #cbd5e0',
            borderRadius: 12,
            padding: '32px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f7fafc',
            transition: 'border-color .2s',
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              inputRef.current?.click()
            }
          }}
        >
          {file ? (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
              <p style={{ fontWeight: 600, color: '#2d3748', marginBottom: 4 }}>{file.name}</p>
              <p style={{ fontSize: '.85rem', color: '#718096' }}>{formatSize(file.size)}</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null) }}
                style={{ marginTop: 8, fontSize: '.8rem', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Remover
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📎</div>
              <p style={{ color: '#4a5568', marginBottom: 4 }}>Clique para selecionar um arquivo</p>
              {step.accept && (
                <p style={{ fontSize: '.8rem', color: '#a0aec0' }}>Formatos: {step.accept}</p>
              )}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={step.accept}
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) setFile(f)
          }}
        />
        {tentou && !ok && (
          <p role="alert" style={{ fontSize: '.85rem', color: '#e53e3e', marginTop: 8 }}>
            ⚠️ Este campo é obrigatório.
          </p>
        )}
        {uploadError && (
          <p role="alert" style={{ fontSize: '.85rem', color: '#e53e3e', marginTop: 8 }}>⚠️ {uploadError}</p>
        )}
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={onBack}>← Voltar</button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading || uploading}
          style={!ok && !loading ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          onClick={handleNext}
        >
          {uploading ? 'Enviando arquivo…' : loading ? 'Enviando…' : isLast ? 'Enviar pesquisa ✓' : 'Próximo →'}
        </button>
      </div>
    </div>
  )
}
