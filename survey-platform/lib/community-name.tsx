'use client'

import { resolveCommunityPrimaryName, type CommunityIdentity } from '@/lib/community-identity'

export function formatCommunityId(communityId: string): string {
  if (!communityId) return '-'
  return communityId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function CommunityDisplay({
  communityId,
  nomeEscola,
  marca,
  unidade,
  className,
}: {
  communityId: string
  nomeEscola?: string | null
  marca?: string | null
  unidade?: string | null
  className?: string
}) {
  const identity: CommunityIdentity = {
    community_id: communityId,
    nome_escola: nomeEscola,
    marca,
    unidade,
  }
  const displayName = resolveCommunityPrimaryName(identity) || formatCommunityId(communityId)
  const showSubtitle = Boolean(communityId) && displayName !== communityId

  return (
    <div className={className}>
      <span className="community-display-name block truncate text-sm font-medium text-inherit">{displayName}</span>
      {showSubtitle && (
        <span className="block truncate font-mono text-xs text-current opacity-55">{communityId}</span>
      )}
    </div>
  )
}
