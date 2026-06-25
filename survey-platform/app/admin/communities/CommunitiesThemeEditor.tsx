'use client'

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { saveCommunityTheme } from './actions'
import type { Community } from './page'
import { CommunityDisplay } from '@/lib/community-name'
import { resolveSchoolName } from '@/lib/community-identity'

interface Props {
  communities: Community[]
}

interface ColorSuggestion {
  primary: string
  secondary: string
  label: string
}

export default function CommunitiesThemeEditor({ communities }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131b]/80 text-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="w-16 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Logo</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Comunidade</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Nome</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Cores</th>
            <th className="w-28 px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Acao</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {communities.map(community => {
            const isExpanded = expandedId === community.community_id
            const displayName = resolveSchoolName(community)

            return (
              <tr key={community.community_id} className={isExpanded ? 'bg-white/[0.04]' : 'transition hover:bg-white/[0.03]'}>
                {!isExpanded ? (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {community.logo ? (
                          <img src={community.logo} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-900" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CommunityDisplay communityId={community.community_id} nomeEscola={displayName} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">{community.marca || '-'}</div>
                      <div className="text-xs text-slate-500">{community.unidade || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ColorSwatch color={community.primary_color} />
                        <ColorSwatch color={community.secondary_color} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpandedId(community.community_id)}
                        className="text-sm font-bold text-[#F7941D] hover:text-[#ffb24a]"
                      >
                        Editar
                      </button>
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-4">
                    <ThemeEditForm community={community} onClose={() => setExpandedId(null)} />
                  </td>
                )}
              </tr>
            )
          })}

          {communities.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                Nenhuma comunidade disponivel.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ThemeEditForm({ community, onClose }: { community: Community; onClose: () => void }) {
  const [primaryColor, setPrimaryColor] = useState(community.primary_color || '#667eea')
  const [secondaryColor, setSecondaryColor] = useState(community.secondary_color || '#764ba2')
  const [logoUrl, setLogoUrl] = useState(community.logo || '')
  const [colorSuggestions, setColorSuggestions] = useState<ColorSuggestion[]>([])
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleLogoFile = async (file: File | null) => {
    if (!file) return

    setUploadingLogo(true)
    setError(undefined)
    setSuccess(false)

    try {
      const suggestions = await extractLogoColorSuggestions(file)
      setColorSuggestions(suggestions)

      if (suggestions.length > 0) {
        setPrimaryColor(suggestions[0]!.primary)
        setSecondaryColor(suggestions[0]!.secondary)
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/admin/communities/${encodeURIComponent(community.community_id)}/logo`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json() as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Falha ao enviar logo')
      }

      setLogoUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError(undefined)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const result = await saveCommunityTheme(community.community_id, {
      marca:          formData.get('marca')          as string || undefined,
      unidade:        formData.get('unidade')        as string || undefined,
      primaryColor:   formData.get('primaryColor')   as string || undefined,
      secondaryColor: formData.get('secondaryColor') as string || undefined,
      logo:           logoUrl,
    })

    setIsPending(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(onClose, 1000)
    }
  }

  const displayName = resolveSchoolName(community)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Marca">
          <input
            type="text"
            name="marca"
            defaultValue={community.marca}
            placeholder="Ex: Matriz"
            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#F7941D]"
          />
        </Field>

        <Field label="Unidade">
          <input
            type="text"
            name="unidade"
            defaultValue={community.unidade}
            placeholder="Ex: Bangu"
            className="w-full rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#F7941D]"
          />
        </Field>

        <Field label="Cor primaria">
          <div className="flex gap-2">
            <input
              type="color"
              name="primaryColor"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-white/[0.08]"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#F7941D]"
              placeholder="#667eea"
            />
          </div>
        </Field>

        <Field label="Cor secundaria">
          <div className="flex gap-2">
            <input
              type="color"
              name="secondaryColor"
              value={secondaryColor}
              onChange={e => setSecondaryColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-white/[0.08]"
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={e => setSecondaryColor(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 font-mono text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#F7941D]"
              placeholder="#764ba2"
            />
          </div>
        </Field>

        <Field label="Logo">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo atual" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Logo</span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={event => void handleLogoFile(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="cursor-pointer rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {uploadingLogo ? 'Enviando...' : logoUrl ? 'Trocar logo' : 'Enviar logo'}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUrl('')
                      setColorSuggestions([])
                    }}
                    className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm font-bold text-white transition hover:bg-white/[0.12]"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">PNG, JPG, WEBP ou SVG até 2 MB.</p>
            {colorSuggestions.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Sugestões de cores
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {colorSuggestions.map(suggestion => (
                    <button
                      key={`${suggestion.primary}-${suggestion.secondary}`}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(suggestion.primary)
                        setSecondaryColor(suggestion.secondary)
                      }}
                      className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] p-2 text-left transition hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
                    >
                      <span className="mb-2 block h-8 overflow-hidden rounded-lg border border-white/10">
                        <span
                          className="block h-full w-full"
                          style={{ background: `linear-gradient(135deg, ${suggestion.primary}, ${suggestion.secondary})` }}
                        />
                      </span>
                      <span className="block text-xs font-bold text-slate-200">{suggestion.label}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                        {suggestion.primary} / {suggestion.secondary}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Field>

        {error && <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">Salvo com sucesso.</div>}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#F7941D] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#ff9f25] disabled:bg-slate-600"
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.12]"
          >
            Cancelar
          </button>
        </div>
      </form>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Preview</div>
        <div
          className="flex h-44 flex-col items-center justify-center rounded-2xl p-6 text-white shadow-2xl shadow-black/30"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo preview" className="mb-4 h-16 w-16 object-contain" />
          ) : (
            <div className="mb-4 h-16 w-16 rounded-xl bg-white/20" />
          )}
          <div className="text-center">
            <div className="font-bold">{displayName || 'Marca Unidade'}</div>
            <div className="text-xs opacity-75">{community.community_id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function ColorSwatch({ color }: { color?: string | null }) {
  if (!color) return <span className="h-7 w-7 rounded-full border border-white/10 bg-white/5" />
  return (
    <span
      className="h-7 w-7 rounded-full border border-white/10 shadow-inner shadow-white/10"
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}

async function extractLogoColorSuggestions(file: File): Promise<ColorSuggestion[]> {
  const colors = file.type === 'image/svg+xml'
    ? await extractSvgColors(file)
    : await extractRasterColors(file)

  const uniqueColors = dedupeColors(colors).slice(0, 5)
  if (uniqueColors.length === 0) return []

  const primary = uniqueColors[0]!
  const secondary = uniqueColors.find(color => color !== primary) ?? adjustColor(primary, -28)
  const accent = uniqueColors.find(color => color !== primary && color !== secondary) ?? adjustColor(primary, 24)
  const darkPrimary = adjustColor(primary, -18)
  const softSecondary = adjustColor(secondary, 22)

  return dedupeSuggestions([
    { primary, secondary, label: 'Logo principal' },
    { primary: darkPrimary, secondary: primary, label: 'Contraste da marca' },
    { primary, secondary: accent, label: 'Marca + destaque' },
    { primary: secondary, secondary: softSecondary, label: 'Variação suave' },
  ])
}

async function extractSvgColors(file: File): Promise<string[]> {
  const text = await file.text()
  const matches = [...text.matchAll(/(?:fill|stroke|stop-color)=["'](#[0-9a-fA-F]{3,8})["']|#[0-9a-fA-F]{6}\b/g)]
  return matches
    .map(match => normalizeHex(match[1] ?? match[0]))
    .filter((color): color is string => Boolean(color))
    .filter(color => !isNearWhiteOrBlack(color))
}

async function extractRasterColors(file: File): Promise<string[]> {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(imageUrl)
    const size = 120
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight, 1)
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return []

    context.drawImage(image, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    const buckets = new Map<string, { count: number; saturation: number }>()

    for (let i = 0; i < pixels.length; i += 16) {
      const alpha = pixels[i + 3] ?? 255
      if (alpha < 160) continue

      const red = pixels[i] ?? 0
      const green = pixels[i + 1] ?? 0
      const blue = pixels[i + 2] ?? 0
      const hex = rgbToHex(quantize(red), quantize(green), quantize(blue))
      if (isNearWhiteOrBlack(hex)) continue

      const saturation = getSaturation(red, green, blue)
      if (saturation < 0.16) continue

      const bucket = buckets.get(hex) ?? { count: 0, saturation }
      bucket.count += 1
      bucket.saturation = Math.max(bucket.saturation, saturation)
      buckets.set(hex, bucket)
    }

    return [...buckets.entries()]
      .sort((a, b) => (b[1].count * b[1].saturation) - (a[1].count * a[1].saturation))
      .map(([hex]) => hex)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível ler as cores da logo'))
    image.src = src
  })
}

function normalizeHex(value: string): string | null {
  const clean = value.trim()
  if (!clean.startsWith('#')) return null
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`.toLowerCase()
  }
  if (clean.length >= 7) return clean.slice(0, 7).toLowerCase()
  return null
}

function dedupeColors(colors: string[]): string[] {
  return [...new Set(colors.map(normalizeHex).filter((color): color is string => Boolean(color)))]
}

function dedupeSuggestions(suggestions: ColorSuggestion[]): ColorSuggestion[] {
  const seen = new Set<string>()
  return suggestions.filter(suggestion => {
    const key = `${suggestion.primary}-${suggestion.secondary}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function quantize(value: number): number {
  return Math.round(value / 32) * 32
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } {
  return {
    red: parseInt(hex.slice(1, 3), 16),
    green: parseInt(hex.slice(3, 5), 16),
    blue: parseInt(hex.slice(5, 7), 16),
  }
}

function getSaturation(red: number, green: number, blue: number): number {
  const max = Math.max(red, green, blue) / 255
  const min = Math.min(red, green, blue) / 255
  if (max === 0) return 0
  return (max - min) / max
}

function isNearWhiteOrBlack(hex: string): boolean {
  const { red, green, blue } = hexToRgb(hex)
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000
  return brightness < 28 || brightness > 238
}

function adjustColor(hex: string, amount: number): string {
  const { red, green, blue } = hexToRgb(hex)
  return rgbToHex(red + amount, green + amount, blue + amount)
}
