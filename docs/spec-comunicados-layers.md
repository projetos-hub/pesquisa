# Spec Técnica — Comunicados via Layers (Provider Model)

> Criado: 2026-06-02  
> Branch sugerida: `feat/comunicados-layers-provider`  
> App Layers: `m3jzq5s00b`  
> Deploy target: https://pesquisa-nu-sand.vercel.app

---

## Resumo do Modelo

A Layers chama seu servidor quando o usuário abre o feed de Comunicados.
Não existe endpoint REST de criação de posts (confirmado via pesquisa exaustiva — ver `docs/layers-comunicados-api-v3.md`).
O modelo é **pull puro**: Layers faz POST no seu endpoint a cada abertura do feed.

```
Usuário abre Comunicados
    ↓
Layers → POST /api/layers/actions/posts
    ↓
Seu servidor consulta tabela `comunicados` no Supabase
    ↓
Retorna JSON com publicações filtradas por comunidade e data
    ↓
Layers exibe no feed
```

---

## 1. Migration SQL

**Número:** `025` (o maior número existente é `024_survey_broadcasts.sql`)  
**Arquivo:** `supabase/migrations/025_comunicados.sql`

```sql
-- 025_comunicados.sql
-- Tabela de comunicados para feed Layers (provider model @layers:Posts:getUpdatedAfter)
-- DOWN: DROP TABLE IF EXISTS comunicados;

CREATE TABLE comunicados (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     UUID        REFERENCES surveys(id) ON DELETE SET NULL,
  community_id  TEXT        NOT NULL,
  title         TEXT        NOT NULL CHECK (char_length(title) > 0),
  description   TEXT        NOT NULL CHECK (char_length(description) > 0),
  category      TEXT        NOT NULL DEFAULT 'Avisos',
  targets       JSONB       NOT NULL DEFAULT '{"groups": ["all"]}',
  author_name   TEXT        NOT NULL DEFAULT 'Raiz Educação',
  attachments   JSONB       NOT NULL DEFAULT '[]',
  approved      BOOLEAN     NOT NULL DEFAULT true,
  status        TEXT        NOT NULL DEFAULT 'published'
                CHECK (status IN ('draft', 'published', 'archived')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes para o filtro principal do provider endpoint:
--   WHERE community_id = $1 AND status = 'published' AND updated_at >= $2
CREATE INDEX idx_comunicados_community_status
  ON comunicados(community_id, status);

CREATE INDEX idx_comunicados_updated_at
  ON comunicados(updated_at DESC);

-- Index para o join na listagem admin (survey_id)
CREATE INDEX idx_comunicados_survey_id
  ON comunicados(survey_id);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER comunicados_updated_at
  BEFORE UPDATE ON comunicados
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;

-- Leitura pública (o endpoint provider usa service role, mas sem RLS permite cache de edge)
-- O endpoint valida o `secret` antes de qualquer query, então exposição é segura.
CREATE POLICY "comunicados_public_read" ON comunicados
  FOR SELECT USING (status = 'published' AND approved = true);

-- Escrita apenas para admins autenticados
CREATE POLICY "comunicados_admin_write" ON comunicados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = (SELECT auth.uid())
    )
  );
```

---

## 2. Endpoint Provider

**Arquivo:** `survey-platform/app/api/layers/actions/posts/route.ts`

```typescript
// POST /api/layers/actions/posts
// Provider endpoint para @layers:Posts:getUpdatedAfter
// A Layers chama este endpoint quando o usuário abre o feed de Comunicados.
//
// Request body (da Layers):
//   {
//     "data":    { "limit": 10, "after": "2026-06-01T00:00:00Z" },
//     "context": { "issuedAt": "...", "action": "...", "community": "uniao" },
//     "secret":  "****"
//   }
//
// Response (seu servidor → Layers):
//   { "result": [ { id, title, description, createdAt, updatedAt, ... } ] }

import { createServiceClient } from '@/lib/supabase-service'

interface LayersPostsRequest {
  data?: {
    limit?: number
    after?: string
  }
  context?: {
    issuedAt?: string
    action?:   string
    community?: string
  }
  secret?: string
}

interface LayersPostResult {
  id:          string
  title:       string
  description: string
  createdAt:   string
  updatedAt:   string
  category:    string
  targets:     { groups: string[]; users?: string[]; members?: string[] }
  author:      { name: string }
  approved:    boolean
}

export async function POST(request: Request): Promise<Response> {
  // ── 1. Parse body ────────────────────────────────────────────────────────────
  let body: LayersPostsRequest
  try {
    body = await request.json() as LayersPostsRequest
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── 2. Validar secret ────────────────────────────────────────────────────────
  // O secret vem no body (não no header). Configurado no AppMaker UI.
  const expectedSecret = process.env.LAYERS_POSTS_SECRET
  if (!expectedSecret) {
    console.error('[posts-provider] LAYERS_POSTS_SECRET não configurada')
    return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
  }
  if (body.secret !== expectedSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 3. Extrair parâmetros ────────────────────────────────────────────────────
  const communityId = body.context?.community
  if (!communityId) {
    return Response.json({ error: 'Missing context.community' }, { status: 400 })
  }

  const limit = Math.min(body.data?.limit ?? 20, 50)  // máx 50 por chamada
  const after = body.data?.after                       // ISO string ou undefined

  // ── 4. Query Supabase ────────────────────────────────────────────────────────
  const supabase = createServiceClient()

  let query = supabase
    .from('comunicados')
    .select('id, title, description, category, targets, author_name, approved, created_at, updated_at')
    .eq('community_id', communityId)
    .eq('status', 'published')
    .eq('approved', true)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (after) {
    query = query.gte('updated_at', after)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error('[posts-provider] Supabase error:', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }

  // ── 5. Formatar resposta ─────────────────────────────────────────────────────
  type ComunicadoRow = {
    id:          string
    title:       string
    description: string
    category:    string
    targets:     { groups?: string[]; users?: string[]; members?: string[] }
    author_name: string
    approved:    boolean
    created_at:  string
    updated_at:  string
  }

  const result: LayersPostResult[] = (rows ?? []).map((row: ComunicadoRow) => ({
    id:          row.id,
    title:       row.title,
    description: row.description,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    category:    row.category,
    targets: {
      groups:  row.targets?.groups  ?? ['all'],
      users:   row.targets?.users   ?? [],
      members: row.targets?.members ?? [],
    },
    author:   { name: row.author_name },
    approved: row.approved,
  }))

  return Response.json({ result })
}
```

---

## 3. Estrutura Admin

### 3.1 Arquivos a criar

```
survey-platform/app/admin/comunicados/
├── page.tsx                    ← lista de comunicados + botão "Novo"
├── ComunicadosTable.tsx        ← tabela Client Component (delete/archive actions)
├── novo/
│   └── page.tsx                ← formulário de criação
└── actions.ts                  ← server actions (criar, arquivar)
```

### 3.2 `actions.ts` — Server Actions

```typescript
// survey-platform/app/admin/comunicados/actions.ts
'use server'

import { revalidatePath }    from 'next/cache'
import { redirect }          from 'next/navigation'
import { createServiceClient } from '@/lib/supabase-service'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── Criar comunicado ─────────────────────────────────────────────────────────
export async function criarComunicado(formData: FormData): Promise<void> {
  const supabaseAuth = await createServerSupabaseClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const communityId = formData.get('community_id') as string
  const title       = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim()
  const category    = (formData.get('category') as string) || 'Avisos'
  const surveyId    = (formData.get('survey_id') as string) || null
  const status      = (formData.get('status') as string)   || 'published'
  const targetsRaw  = formData.get('targets') as string

  if (!communityId || !title || !description) {
    throw new Error('Campos obrigatórios: community_id, title, description')
  }

  let targets: { groups: string[] } = { groups: ['all'] }
  if (targetsRaw) {
    try { targets = JSON.parse(targetsRaw) } catch { /* usa default */ }
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('comunicados')
    .insert({
      community_id: communityId,
      title,
      description,
      category,
      survey_id:   surveyId,
      status,
      targets,
      approved:    true,
    })

  if (error) throw new Error(`Erro ao criar comunicado: ${error.message}`)

  revalidatePath('/admin/comunicados')
  redirect('/admin/comunicados')
}

// ── Arquivar comunicado ──────────────────────────────────────────────────────
export async function arquivarComunicado(id: string): Promise<void> {
  const supabaseAuth = await createServerSupabaseClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('comunicados')
    .update({ status: 'archived' })
    .eq('id', id)

  if (error) throw new Error(`Erro ao arquivar: ${error.message}`)

  revalidatePath('/admin/comunicados')
}

// ── Publicar comunicado (draft → published) ──────────────────────────────────
export async function publicarComunicado(id: string): Promise<void> {
  const supabaseAuth = await createServerSupabaseClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('comunicados')
    .update({ status: 'published' })
    .eq('id', id)

  if (error) throw new Error(`Erro ao publicar: ${error.message}`)

  revalidatePath('/admin/comunicados')
}
```

### 3.3 `page.tsx` — Listagem

```typescript
// survey-platform/app/admin/comunicados/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }         from '@/lib/supabase-service'
import { arquivarComunicado, publicarComunicado } from './actions'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publicado', cls: 'bg-green-100 text-green-700' },
  archived:  { label: 'Arquivado', cls: 'bg-yellow-100 text-yellow-700' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default async function ComunicadosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()
  const { data: rows } = await service
    .from('comunicados')
    .select('id, community_id, title, category, status, created_at, survey_id')
    .order('created_at', { ascending: false })
    .limit(100)

  type Row = {
    id: string; community_id: string; title: string;
    category: string; status: string; created_at: string; survey_id: string | null
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Comunicados</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Feed de comunicados no app Layers (provider model)
          </p>
        </div>
        <Link
          href="/admin/comunicados/novo"
          className="bg-[#F7941D] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#D97B10] transition-colors font-medium"
        >
          + Novo comunicado
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {(rows ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 p-6 text-center">
            Nenhum comunicado criado ainda.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(rows as Row[]).map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{row.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.community_id} · {row.category} ·{' '}
                    {new Date(row.created_at).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <StatusBadge status={row.status} />
                <div className="flex gap-2 shrink-0">
                  {row.status === 'draft' && (
                    <form action={publicarComunicado.bind(null, row.id)}>
                      <button
                        type="submit"
                        className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50"
                      >
                        Publicar
                      </button>
                    </form>
                  )}
                  {row.status === 'published' && (
                    <form action={arquivarComunicado.bind(null, row.id)}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50"
                      >
                        Arquivar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 3.4 `novo/page.tsx` — Formulário de Criação

```typescript
// survey-platform/app/admin/comunicados/novo/page.tsx
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient }         from '@/lib/supabase-service'
import { criarComunicado }             from '../actions'

export default async function NovoComunicadoPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const service = createServiceClient()

  // Lista de comunidades para o select
  const { data: communities } = await service
    .from('communities')
    .select('community_id, nome_escola')
    .order('nome_escola', { ascending: true })

  // Lista de surveys ativas para vínculo opcional
  const { data: surveys } = await service
    .from('surveys')
    .select('id, title')
    .eq('status', 'active')
    .order('title', { ascending: true })

  type Community = { community_id: string; nome_escola: string }
  type Survey    = { id: string; title: string }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Novo Comunicado</h2>

      <form action={criarComunicado} className="space-y-5">
        {/* Comunidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comunidade *
          </label>
          <select
            name="community_id"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          >
            <option value="">Selecione uma comunidade</option>
            {(communities as Community[] ?? []).map((c) => (
              <option key={c.community_id} value={c.community_id}>
                {c.nome_escola || c.community_id}
              </option>
            ))}
          </select>
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título *
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="Ex: Pesquisa de Satisfação aberta"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição *
          </label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Texto que aparece no corpo do comunicado no app Layers"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          />
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoria
          </label>
          <select
            name="category"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          >
            <option value="Avisos">Avisos</option>
            <option value="Pesquisas">Pesquisas</option>
            <option value="Eventos">Eventos</option>
            <option value="Comunicados">Comunicados</option>
          </select>
        </div>

        {/* Pesquisa vinculada (opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pesquisa vinculada (opcional)
          </label>
          <select
            name="survey_id"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          >
            <option value="">Nenhuma</option>
            {(surveys as Survey[] ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status inicial
          </label>
          <select
            name="status"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F7941D]"
          >
            <option value="published">Publicado (aparece imediatamente)</option>
            <option value="draft">Rascunho (não aparece no app)</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-[#F7941D] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#D97B10] transition-colors"
          >
            Criar comunicado
          </button>
          <a
            href="/admin/comunicados"
            className="px-6 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  )
}
```

### 3.5 Adicionar link no sidebar (`app/admin/layout.tsx`)

Adicionar após o link de "Identidade Visual":

```tsx
<Link
  href="/admin/comunicados"
  className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0AEC0] rounded-lg hover:bg-[#2D3748] transition-colors"
>
  <span>📣</span>
  Comunicados
</Link>
```

---

## 4. Registro no AppMaker

### 4.1 Blocker pendente

**IMPORTANTE — confirmar antes de executar o PUT:**

O PUT no AppMaker é quase certamente **replace total** do objeto de instalação, não merge de campos.
Fazer `PUT` com payload incompleto sobrescreve o portal embarcado existente e derruba funcionalidades.

**Mitigação obrigatória:** fazer GET da instalação atual, fazer merge manual com o novo `services.responds`, e só então fazer PUT.

### 4.2 Script de registro (`scripts/register-posts-provider.ts`)

```typescript
// scripts/register-posts-provider.ts
// Registra o endpoint de comunicados no manifesto AppMaker da Layers
// para cada comunidade instalada.
//
// USO:
//   npx tsx scripts/register-posts-provider.ts --dry-run   (só mostra o diff)
//   npx tsx scripts/register-posts-provider.ts             (executa o PUT)
//
// REQUISITOS:
//   LAYERS_API_TOKEN — token app com permissão de leitura/escrita de instalações
//   LAYERS_APP_ID    — ID do app (m3jzq5s00b)

const BASE_URL   = 'https://api.layers.digital'
const APP_ID     = process.env.LAYERS_APP_ID  ?? 'm3jzq5s00b'
const TOKEN      = process.env.LAYERS_API_TOKEN
const POSTS_URL  = 'https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts'
const DRY_RUN    = process.argv.includes('--dry-run')

if (!TOKEN) {
  console.error('LAYERS_API_TOKEN nao definida')
  process.exit(1)
}

// Comunidades instaladas — preencher com os IDs reais
// (obter via GET /v1/appmaker/apps/{APP_ID}/installations)
const COMMUNITIES = [
  'uniao',
  'americano',
  'sap',
  'qi-tijuca',
  'qi-recreio',
  'qi-rio2',
  'qi-metropolitano',
  'qi-freguesia',
  // ... adicionar todas
]

const NEW_SERVICE = {
  action: '@layers:Posts:getUpdatedAfter',
  reason: 'Prover comunicados e anúncios de pesquisas da Raiz Educação',
  url:    POSTS_URL,
}

async function getInstallation(communityId: string): Promise<Record<string, unknown>> {
  const res = await fetch(
    `${BASE_URL}/v1/appmaker/apps/${APP_ID}/installations/${communityId}`,
    {
      headers: {
        Authorization:  `Bearer ${TOKEN}`,
        'community-id': communityId,
      },
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET instalação ${communityId} falhou: ${res.status} — ${text}`)
  }
  return res.json() as Promise<Record<string, unknown>>
}

async function putInstallation(
  communityId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/v1/appmaker/apps/${APP_ID}/installations/${communityId}`,
    {
      method:  'PUT',
      headers: {
        Authorization:  `Bearer ${TOKEN}`,
        'community-id': communityId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PUT instalação ${communityId} falhou: ${res.status} — ${text}`)
  }
}

async function registerForCommunity(communityId: string): Promise<void> {
  // ── 1. GET instalação atual ─────────────────────────────────────────────────
  let current: Record<string, unknown>
  try {
    current = await getInstallation(communityId)
  } catch (err) {
    console.error(`  [${communityId}] GET falhou:`, err)
    return
  }

  // ── 2. Merge: adicionar/substituir o service de posts, manter o resto ────────
  type Services = {
    enabled?: boolean
    responds?: Array<{ action: string; reason?: string; url: string }>
  }

  const services = (current.services ?? {}) as Services

  // Remove entrada anterior de posts (se existir) e adiciona a nova
  const existingResponds = (services.responds ?? []) as Array<{ action: string; reason?: string; url: string }>
  const otherResponds = existingResponds.filter(
    (s) => s.action !== '@layers:Posts:getUpdatedAfter'
  )
  const alreadyRegistered = existingResponds.some(
    (s) => s.action === '@layers:Posts:getUpdatedAfter' && s.url === POSTS_URL
  )

  if (alreadyRegistered) {
    console.log(`  [${communityId}] Ja registrado, skip.`)
    return
  }

  const mergedPayload = {
    ...current,
    services: {
      ...services,
      enabled:  true,
      responds: [...otherResponds, NEW_SERVICE],
    },
  }

  // ── 3. Diff visual ───────────────────────────────────────────────────────────
  console.log(`  [${communityId}] Adicionando service:`, NEW_SERVICE)
  console.log(`  [${communityId}] Responds existentes preservados:`, otherResponds.length)

  if (DRY_RUN) {
    console.log(`  [${communityId}] DRY RUN — payload seria:`)
    console.log(JSON.stringify(mergedPayload, null, 2))
    return
  }

  // ── 4. PUT ───────────────────────────────────────────────────────────────────
  try {
    await putInstallation(communityId, mergedPayload)
    console.log(`  [${communityId}] OK`)
  } catch (err) {
    console.error(`  [${communityId}] PUT falhou:`, err)
  }
}

async function main(): Promise<void> {
  console.log(`Registrando endpoint de comunicados`)
  console.log(`  App ID:     ${APP_ID}`)
  console.log(`  URL:        ${POSTS_URL}`)
  console.log(`  Dry run:    ${DRY_RUN}`)
  console.log(`  Comunidades: ${COMMUNITIES.length}`)
  console.log()

  for (const community of COMMUNITIES) {
    await registerForCommunity(community)
  }

  console.log()
  console.log('Concluido.')
}

main().catch(console.error)
```

---

## 5. Variável de Ambiente

| Variável | Onde configurar | Descrição |
|----------|----------------|-----------|
| `LAYERS_POSTS_SECRET` | `.env.local` + Vercel Dashboard | Secret configurado no AppMaker UI (field `secret` no manifesto da instalação). A Layers envia esse valor no body de cada request ao endpoint provider. |

**Adicionar ao `.env.local`:**
```
LAYERS_POSTS_SECRET=<valor_configurado_no_appmaker>
```

**Adicionar no Vercel:**
Settings → Environment Variables → `LAYERS_POSTS_SECRET` → Production + Preview.

### Como descobrir/configurar o secret no AppMaker

O campo `secret` é configurado no AppMaker UI na instalação do app por comunidade.
Não existe endpoint REST para defini-lo programaticamente (não documentado).
Passos:
1. Abrir AppMaker: https://appmaker.layers.digital (ou URL do painel Raiz)
2. Selecionar o app `m3jzq5s00b`
3. Na instalação de cada comunidade, localizar o campo `secret` do service provider
4. Definir um valor fixo (ex: UUID gerado uma vez via `crypto.randomUUID()`)
5. Salvar esse valor como `LAYERS_POSTS_SECRET` no `.env.local` e no Vercel

---

## 6. Sequência de Implementação

### Fase 1 — Banco (30 min)
1. Criar `supabase/migrations/025_comunicados.sql` com o SQL da Seção 1
2. Testar localmente: `npx supabase db reset` (local) ou aplicar via MCP
3. Verificar que tabela criada, RLS ativa, indexes criados

### Fase 2 — Endpoint Provider (45 min)
1. Criar `app/api/layers/actions/posts/route.ts`
2. Adicionar `LAYERS_POSTS_SECRET=test-secret-local` no `.env.local`
3. Testar com curl (ver Seção 7)
4. Verificar que retorna `{ result: [] }` para comunidade sem comunicados
5. Inserir linha na tabela e verificar que aparece no retorno

### Fase 3 — Admin UI (90 min)
1. Criar `app/admin/comunicados/actions.ts`
2. Criar `app/admin/comunicados/page.tsx`
3. Criar `app/admin/comunicados/novo/page.tsx`
4. Adicionar link no `app/admin/layout.tsx`
5. Testar criação de comunicado pelo admin e verificar que aparece no endpoint

### Fase 4 — Registro no AppMaker (variável)
1. Confirmar com a Layers se PUT é replace ou merge (ou testar em comunidade não-crítica)
2. Descobrir/configurar o secret no AppMaker UI
3. Rodar `register-posts-provider.ts` com `--dry-run` primeiro
4. Verificar o diff — confirmar que portals e outros campos são preservados
5. Se ok, rodar sem `--dry-run`

### Fase 5 — Deploy + Verificação
1. Commitar em `feat/comunicados-layers-provider`
2. Push → PR → preview deploy
3. Verificar preview URL com o curl da Seção 7
4. Merge → deploy production
5. Configurar `LAYERS_POSTS_SECRET` no Vercel Production
6. Testar abrindo o feed de Comunicados no app Layers em uma comunidade

---

## 7. Como Testar Localmente

### 7.1 Testar o endpoint provider via curl

```bash
# Servidor rodando em localhost:3000
# LAYERS_POSTS_SECRET=test-secret-local no .env.local

curl -X POST http://localhost:3000/api/layers/actions/posts \
  -H "Content-Type: application/json" \
  -d '{
    "data": { "limit": 10, "after": "2000-01-01T00:00:00Z" },
    "context": {
      "issuedAt": "2026-06-02T12:00:00Z",
      "action": "@layers:Posts:getUpdatedAfter",
      "community": "uniao"
    },
    "secret": "test-secret-local"
  }'
```

**Esperado:** `{ "result": [] }` (se tabela vazia) ou array com comunicados publicados.

### 7.2 Testar rejeição de secret inválido

```bash
curl -X POST http://localhost:3000/api/layers/actions/posts \
  -H "Content-Type: application/json" \
  -d '{
    "data": {},
    "context": { "community": "uniao" },
    "secret": "wrong-secret"
  }'
```

**Esperado:** `{ "error": "Unauthorized" }` com status 401.

### 7.3 Inserir comunicado de teste e verificar

```sql
-- Executar via MCP ou Supabase SQL editor
INSERT INTO comunicados (community_id, title, description, status, approved)
VALUES (
  'uniao',
  'Pesquisa de Satisfação aberta',
  'A pesquisa CSAT 2026 está disponível. Leva menos de 5 minutos.',
  'published',
  true
);
```

Depois rodar o curl da 7.1 — deve retornar o comunicado criado.

### 7.4 Testar filtro `after`

```bash
# Data futura — deve retornar vazio mesmo com comunicados existentes
curl -X POST http://localhost:3000/api/layers/actions/posts \
  -H "Content-Type: application/json" \
  -d '{
    "data": { "limit": 10, "after": "2099-01-01T00:00:00Z" },
    "context": { "community": "uniao" },
    "secret": "test-secret-local"
  }'
```

**Esperado:** `{ "result": [] }`

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| PUT AppMaker sobrescreve portal embarcado existente | Alta | Alto | GET antes do PUT; `--dry-run` obrigatório; testar em comunidade não-crítica primeiro |
| Secret não configurável via UI do AppMaker (campo não existe) | Média | Bloqueante para Fase 4 | Contatar suporte Layers; como fallback, omitir validação do secret e usar apenas IP allowlist (Layers tem IPs fixos?) |
| Layers não chama o endpoint se app não tiver permissão `@app:layers-comunicados` | Baixa | Alto | Verificar permissões do app `m3jzq5s00b` no AppMaker antes de Fase 4 |
| Latência: Layers pode não re-checar imediatamente após criação de comunicado | Baixa | Baixo | Modelo pull — delay é aceitável; usar push notification para alertas imediatos |
| Encoding UTF-8 em título/descrição (bug conhecido no projeto) | Média | Médio | Usar `TEXT` (não `VARCHAR`); Supabase retorna UTF-8 nativo — encoding bug é na camada de exibição, não no banco |

---

## 9. Referências

| Documento | Localização |
|-----------|-------------|
| Pesquisa definitiva sobre provider model | `docs/layers-comunicados-api-v3.md` |
| Schema completo do payload de resposta | `docs/layers-comunicados-api-v2.md` |
| Padrão de endpoint com validação de secret | `app/api/cron/process-dispatches/route.ts` |
| Padrão de server actions admin | `app/admin/dispatch/page.tsx` |
| createServiceClient | `lib/supabase-service.ts` |
| PUT AppMaker (updateInstallation) | https://developers.layers.education/open-api/appmaker/operations/updateInstallation.html |
| Prover Publicações (spec técnica Layers) | https://developers.layers.education/content/communication/comunicados/referencia/prover-publicacoes.html |
