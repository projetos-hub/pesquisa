# Layers Hub API — Referência Técnica

Fonte: https://developers.layers.education/
Salvo em: 2026-03-16

---

## Base URL

```
https://api.layers.digital
```

## Autenticação

Todas as requisições exigem dois headers:

```
Authorization: Bearer {LAYERS_API_TOKEN}
community-id: {communityId}
```

O `LAYERS_API_TOKEN` está em `.env.local` como `LAYERS_API_TOKEN`.
É um JWT com `type: "auth:app"` e `appId: "m3jzq5s00b"`.

---

## Endpoints Utilizados no Projeto

### GET /v1/users/{userId}
Retorna dados do usuário na comunidade.

**Headers:** Authorization + community-id
**Path param:** `userId` — ID do usuário na comunidade (de `LayersPortal.userId` ou `LayersPortal.accountId`)

**Resposta 200:**
```json
{
  "_id": "string",
  "name": "string",
  "email": "string",
  "active": true,
  "community": "string",
  "status": "ACTIVE",
  "roles": [["guardian", "professor"]],
  "address": {
    "code": "string",
    "state": "string",
    "city": "string",
    "district": "string",
    "address": "string",
    "number": "string"
  },
  "createdAt": "2020-01-01T00:00:00.000Z",
  "updatedAt": "2020-01-01T00:00:00.000Z"
}
```

**Mapeamento de roles:**
- `guardian` → perfil `responsavel`
- `student` → perfil `aluno`
- outros → perfil `responsavel` (default)

---

### GET /v1/users/{userId}/related
Retorna membros relacionados ao usuário (ex: alunos de um responsável).

**Headers:** Authorization + community-id
**Path param:** `userId`

**Resposta 200:**
```json
{
  "members": [
    {
      "_id": "12345678",
      "name": "Gabriel Raniere",
      "alias": "abc123d",
      "birth": "2010-04-10T00:00:00.000Z",
      "active": true,
      "community": "test",
      "access": [
        { "permissions": ["guardian"], "user": "string" }
      ],
      "createdAt": "2020-01-01T00:00:00.000Z",
      "updatedAt": "2020-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /v1/members/{memberId}
Retorna dados de um membro específico da comunidade.

**Headers:** Authorization + community-id
**Path param:** `memberId`

**Resposta 200:**
```json
{
  "_id": "string",
  "name": "string",
  "alias": "string",
  "birth": "ISO 8601 date",
  "active": true,
  "community": "string",
  "access": [
    { "permissions": ["string"], "user": "string" }
  ],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

---

### GET /v1/groups
Lista turmas/grupos da comunidade. Contém série/turma.

**Headers:** Authorization + community-id
**Query params:** `active` (boolean), `name` (string), `season` (string)

**Resposta 200:**
```json
[
  {
    "_id": "string",
    "alias": "3A",
    "name": "Terceiro ano A",
    "community": "test",
    "active": true,
    "season": "Ano letivo 2020",
    "tags": [{ "id": "string", "name": "string" }],
    "admins": [{ "user": "string" }],
    "fields": {}
  }
]
```

---

### GET /v1/enrollments
Lista matrículas. Liga usuário a grupo (turma).

**Headers:** Authorization + community-id
**Query params:** `active` (boolean), `group` (string — ID do grupo)

**Resposta 200:**
```json
[
  {
    "_id": "string",
    "community": "test",
    "kind": "member",
    "entity": "string",
    "group": "string",
    "active": true,
    "createdAt": "2020-01-01T00:00:00.000Z",
    "updatedAt": "2020-01-01T00:00:00.000Z"
  }
]
```

---

## O que a API fornece para o survey

| Campo survey | Fonte Layers API | Disponível? |
|---|---|---|
| `nome` (responsável) | `GET /v1/users/{id}` → `user.name` | ✅ |
| `perfil` | `GET /v1/users/{id}` → `user.roles` (mapeado) | ✅ |
| `nomeAluno` | `GET /v1/users/{id}/related` → `members[0].name` | ✅ |
| `serie` | Requer enrollment + group lookup (2 chamadas extras) | ⚠️ não implementado |
| `school` | Vem do `survey_communities.theme.nomeEscola` no Supabase | ✅ (já funciona) |

---

## Outros Endpoints Disponíveis (não usados no survey)

- `GET /v1/users` — Listar usuários
- `GET /v1/users/search` — Buscar usuários
- `GET /v1/members` — Listar membros
- `GET /v1/enrollments/{id}` — Ver matrícula específica
- AppMaker API — Gerenciar instalações
- **Notifications API** — documentação completa em `docs/layers-notifications.md`
- Data Sync — Sync bidirecional (não necessário agora)

---

## Variáveis de Ambiente (já configuradas)

```
NEXT_PUBLIC_LAYERS_APP_ID=m3jzq5s00b
LAYERS_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6ImF1dGgiLC...
```
