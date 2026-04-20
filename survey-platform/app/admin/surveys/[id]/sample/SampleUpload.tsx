'use client'

import { useState } from 'react'
import { read, utils } from 'xlsx'

interface Props {
  surveyId: string
  surveySlug: string
}

interface PreviewRow {
  nome: string
  nomefantasia: string
  emails: string[]
}

export default function SampleUpload({ surveyId, surveySlug }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError('')
    setSuccess('')

    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = read(buffer)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = utils.sheet_to_json(sheet) as Record<string, any>[]

      // Preview: primeiras 20 linhas
      const previewData: PreviewRow[] = rows.slice(0, 20).map((row) => ({
        nome: row.NOME || '',
        nomefantasia: row.NOMEFANTASIA || '',
        emails: [
          row['EMAIL INSTITUCIONAL'],
          row['EMAIL RESP FIN'],
          row['EMAIL RESP ACAD'],
        ].filter(Boolean),
      }))

      setFile(selectedFile)
      setPreview(previewData)
    } catch (err) {
      setError(`Erro ao parsear Excel: ${err instanceof Error ? err.message : 'desconhecido'}`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/admin/surveys/${surveyId}/sample`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao fazer upload')
      }

      const data = await res.json()
      setSuccess(
        `Amostra salva! ${data.total_entries} entradas, ${data.resolved_layers_ids} IDs Layers resolvidos`
      )
      setFile(null)
      setPreview([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Arquivo Excel (TOTVS)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
        <p className="text-xs text-gray-500 mt-1">
          Esperado: colunas NOME, NOMEFANTASIA, EMAIL INSTITUCIONAL, EMAIL RESP FIN, EMAIL RESP ACAD
        </p>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Preview (primeiras {preview.length} linhas)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Escola</th>
                  <th className="px-3 py-2 text-left">Emails</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-gray-700">{row.nome}</td>
                    <td className="px-3 py-2 text-gray-700">{row.nomefantasia}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {row.emails.length > 0 ? row.emails.join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          ✓ {success}
        </div>
      )}

      {/* Actions */}
      {preview.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400
            text-white font-semibold py-2 px-4 rounded"
        >
          {loading ? 'Processando...' : 'Processar e salvar'}
        </button>
      )}
    </div>
  )
}
