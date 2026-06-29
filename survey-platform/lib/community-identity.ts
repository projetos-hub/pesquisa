export interface CommunityIdentity {
  community_id?: string | null
  nome_escola?: string | null
  marca?: string | null
  unidade?: string | null
}

export interface CommunityExportFields {
  marca: string
  unidade: string
  nomeComunidade: string
  communityId: string
}

export function composeSchoolName(marca?: string | null, unidade?: string | null): string {
  const cleanMarca = marca?.trim()
  const cleanUnidade = unidade?.trim()
  const visibleUnit = cleanUnidade?.toLowerCase() === 'geral' ? '' : cleanUnidade

  return [cleanMarca, visibleUnit]
    .filter(Boolean)
    .join(' ')
}

export function resolveCommunityPrimaryName(identity: CommunityIdentity): string {
  const composedName = composeSchoolName(identity.marca, identity.unidade)
  if (composedName) return composedName

  const explicitName = identity.nome_escola?.trim()
  if (explicitName) return explicitName

  return identity.community_id ?? ''
}

export function resolveSchoolName(identity: CommunityIdentity): string {
  return resolveCommunityPrimaryName(identity)
}

export function getCommunityExportFields(identity: CommunityIdentity): CommunityExportFields {
  const marca = identity.marca?.trim() ?? ''
  const unidade = identity.unidade?.trim() ?? ''
  const communityId = identity.community_id?.trim() ?? ''

  return {
    marca,
    unidade,
    nomeComunidade: resolveCommunityPrimaryName(identity),
    communityId,
  }
}
