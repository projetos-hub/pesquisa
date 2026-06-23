export interface CommunityThemePayload {
  nomeEscola?: string
  primaryColor?: string
  secondaryColor?: string
  logo?: string
  indicacaoLink?: string
  welcomeMessage?: string
  thankyouMessage?: string
}

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 16)
}

function optionalFormString(formData: FormData, field: string): string | undefined {
  const value = formData.get(field)
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function buildCommunityThemePayload(formData: FormData): CommunityThemePayload {
  return {
    nomeEscola: optionalFormString(formData, 'nomeEscola'),
    primaryColor: optionalFormString(formData, 'primaryColor'),
    secondaryColor: optionalFormString(formData, 'secondaryColor'),
    logo: optionalFormString(formData, 'logo'),
    indicacaoLink: optionalFormString(formData, 'indicacaoLink'),
    welcomeMessage: optionalFormString(formData, 'welcomeMessage'),
    thankyouMessage: optionalFormString(formData, 'thankyouMessage'),
  }
}

export function getCommunityDatesPayload(formData: FormData): {
  openDate: string | null
  closeDate: string | null
} {
  return {
    openDate: optionalFormString(formData, 'open_date') ?? null,
    closeDate: optionalFormString(formData, 'close_date') ?? null,
  }
}
