import Link from 'next/link'
import { CommunityDisplay } from '@/lib/community-name'
import { resolveSchoolName } from '@/lib/community-identity'

export interface Community {
  id: string
  community_id: string
  open_date?: string | null
  close_date?: string | null
  status?: string | null
  nome_escola?: string | null
  marca?: string | null
  unidade?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  logo?: string | null
}

interface Props {
  communities: Community[]
}

export default function CommunitiesThemeEditor({ communities }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f131b]/80">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className="w-16 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Logo</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Comunidade</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Cores</th>
            <th className="w-28 px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Acao</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {communities.map(community => {
            const displayName = resolveSchoolName(community)

            return (
            <tr key={community.id} className="transition hover:bg-white/[0.03]">
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
                <CommunityDisplay
                  communityId={community.community_id}
                  nomeEscola={displayName}
                  className="[&_.community-display-name]:text-white"
                />
                {(community.marca || community.unidade) && (
                  <span className="mt-1 block text-xs text-slate-500">
                    {[community.marca, community.unidade].filter(Boolean).join(' / ')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ColorSwatch color={community.primary_color} />
                  <ColorSwatch color={community.secondary_color} />
                  {!community.primary_color && !community.secondary_color && (
                    <span className="text-sm text-slate-500">Sem cores globais</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href="/admin/communities" className="text-sm font-bold text-[#F7941D] hover:text-[#ffb24a]">
                  Editar
                </Link>
              </td>
            </tr>
          )})}

          {communities.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                Nenhuma comunidade instalada nesta pesquisa.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ColorSwatch({ color }: { color?: string | null }) {
  if (!color) return null
  return (
    <span
      className="h-7 w-7 rounded-full border border-white/10 shadow-inner shadow-white/10"
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}
