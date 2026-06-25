export interface CommunityIdentity {
  community_id?: string | null
  nome_escola?: string | null
  marca?: string | null
  unidade?: string | null
}

export function composeSchoolName(marca?: string | null, unidade?: string | null): string {
  const cleanMarca = marca?.trim()
  const cleanUnidade = unidade?.trim()
  const visibleUnit = cleanUnidade?.toLowerCase() === 'geral' ? '' : cleanUnidade

  return [cleanMarca, visibleUnit]
    .filter(Boolean)
    .join(' ')
}

export function resolveSchoolName(identity: CommunityIdentity): string {
  const explicitName = identity.nome_escola?.trim()
  if (explicitName) return explicitName

  const composedName = composeSchoolName(identity.marca, identity.unidade)
  if (composedName) return composedName

  return identity.community_id ?? ''
}
