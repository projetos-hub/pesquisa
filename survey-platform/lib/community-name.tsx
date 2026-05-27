'use client'

// Resolve o nome legível de uma comunidade a partir do community_id
// Usa nomeEscola do theme (survey_communities) se disponível,
// senão formata o community_id (ex: "matriz-bangu" → "Matriz Bangu")

export function formatCommunityId(communityId: string): string {
  if (!communityId) return '—'
  // Capitaliza palavras separadas por hífen
  return communityId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Componente para exibir nome + subtítulo
// Usar onde antes havia só {session.school} ou {community_id}
export function CommunityDisplay({
  communityId,
  nomeEscola,
  className,
}: {
  communityId: string
  nomeEscola?: string | null
  className?: string
}) {
  const displayName = nomeEscola || formatCommunityId(communityId)
  const showSubtitle = Boolean(nomeEscola) && nomeEscola !== communityId

  return (
    <div className={className}>
      <span className="font-medium text-gray-900 text-sm">{displayName}</span>
      {showSubtitle && (
        <span className="block text-xs text-gray-400 font-mono">{communityId}</span>
      )}
    </div>
  )
}
