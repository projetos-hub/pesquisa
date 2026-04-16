# Layers Notifications API — Referência Técnica

Fonte: https://developers.layers.education/content/notification/
Testado e validado em: 2026-04-16

---

## Visão geral

A Layers oferece dois canais de entrega de notificação:

| Canal | O que é | Pré-requisito no usuário |
|---|---|---|
| `pushNotification` | Notificação no celular/tablet via app Layers | Ter o app Layers instalado |
| `email` | Email para o endereço cadastrado na Layers | Ter email cadastrado |

Ambos podem ser disparados simultaneamente no mesmo request.

---

## Pré-requisito crítico: manifesto do app

**Antes de qualquer chamada funcionar**, o app precisa declarar quais canais pode usar no manifesto (App Maker → Meus Apps → Pesquisa → Manifesto → Notificações).

O campo `channels` no manifesto **deve** conter os canais que o app vai usar:

```json
"notification": {
  "enabled": true,
  "channels": ["email", "pushNotification"],
  "description": "Notificar sobre novas pesquisas"
}
```

**Se `channels` estiver vazio (`[]`), a API retorna 400 para qualquer tipo de canal:**
```
{"error": "Types pushNotification are not allowed for app"}
{"error": "Types email are not allowed for app"}
```

Isso não é erro de permissão do token — é configuração do manifesto do app.

---

## Endpoint

```
POST https://api.layers.digital/v2/notification/send
```

---

## Autenticação

Mesmos headers já usados na Hub API — nenhuma credencial nova necessária:

```
Authorization: Bearer {LAYERS_API_TOKEN}
community-id: {communityId}
Content-Type: application/json
```

O `LAYERS_API_TOKEN` é o token `auth:app` do App Maker. O mesmo token que lê dados de usuários também envia notificações, desde que o manifesto esteja configurado corretamente.

---

## Estrutura completa do payload

```json
{
  "targets": {
    "topics": [
      {
        "kind": "user | member | group",
        "email": "string",
        "id": "string",
        "alias": "string"
      }
    ],
    "roles": ["guardian", "student", "admin"]
  },
  "title": "string (max 150 caracteres)",
  "body": "string",
  "action": {
    "type": "portal | external",
    "portalAlias": "string",
    "path": "string"
  },
  "scheduleDate": "ISO 8601 (opcional)",
  "channels": {
    "pushNotification": {
      "title": "string",
      "body": "string"
    },
    "email": {
      "title": "string",
      "body": "string",
      "actionLabel": "string (texto do botão CTA no email)",
      "backgroundUrl": "string (URL da imagem de fundo do email)"
    }
  }
}
```

Quando `channels` é omitido, o padrão é `pushNotification`.

---

## Segmentação — campo `targets`

### `topics.kind` — quem recebe

| Valor | O que é | Campos usados |
|---|---|---|
| `user` | Usuário individual da comunidade | `id`, `alias` ou `email` |
| `member` | Aluno ou staff (membro sem login) | `id` ou `alias` |
| `group` | Turma inteira ou unidade organizacional | `alias` (ex: `"turma-3a"`) |

### `roles` — filtro por perfil

Ao segmentar `group`, o campo `roles` filtra quais perfis vinculados recebem:

| Valor | Quem é |
|---|---|
| `guardian` | Responsável/familiar do aluno |
| `student` | Aluno com login na Layers |
| `admin` | Administrador da comunidade |

Exemplo: `topics: [{kind: "group", alias: "3a"}]` + `roles: ["guardian"]` → envia para todos os responsáveis dos alunos da turma 3A.

---

## Exemplos de segmentação

### Usuário individual por email
```json
{
  "targets": {
    "topics": [{"kind": "user", "email": "fulano@escola.com.br"}]
  }
}
```

### Turma inteira (todos os responsáveis)
```json
{
  "targets": {
    "topics": [{"kind": "group", "alias": "turma-3a"}],
    "roles": ["guardian"]
  }
}
```

### Toda a comunidade (todos os responsáveis)
```json
{
  "targets": {
    "topics": [{"kind": "group", "alias": "all"}],
    "roles": ["guardian"]
  }
}
```

### Múltiplos usuários simultâneos
```json
{
  "targets": {
    "topics": [
      {"kind": "user", "email": "usuario1@escola.com.br"},
      {"kind": "user", "email": "usuario2@escola.com.br"}
    ]
  }
}
```

---

## Ação ao clicar — campo `action`

Define o que acontece quando o usuário toca na notificação.

### Opção A: Abrir dentro do Layers (recomendada)

Abre o mini app embedado **dentro do app Layers**, mantendo o contexto de autenticação.

```json
"action": {
  "type": "portal",
  "portalAlias": "@raizeducacao:pesquisa",
  "path": "/"
}
```

- `portalAlias` é o alias do portal registrado no manifesto. Para este projeto: `@raizeducacao:pesquisa`
- `path` é a rota interna do portal. Usar `"/"` abre o portal no root e o `portal/page.tsx` resolve o redirecionamento correto baseado no contexto do usuário
- **NÃO passar `/p/csat` diretamente no path** — o Layers interpreta como rota interna e gera URL 404. O portal resolver cuida disso

### Opção B: Abrir URL externa

Abre uma URL no browser externo (fora do Layers).

```json
"action": {
  "type": "external",
  "path": "https://pesquisa-nu-sand.vercel.app/p/csat?communityId=raizeducacao"
}
```

Útil para usuários que não têm o app instalado ou para links diretos sem contexto de portal.

---

## Canais — campo `channels`

### Push notification apenas
```json
"channels": {
  "pushNotification": {
    "title": "Pesquisa de Satisfação",
    "body": "Toque para responder a pesquisa da sua escola."
  }
}
```

### Email apenas
```json
"channels": {
  "email": {
    "title": "Pesquisa de Satisfação",
    "body": "Queremos ouvir sua opinião sobre a escola.",
    "actionLabel": "Responder Pesquisa",
    "backgroundUrl": "https://exemplo.com/banner.jpg"
  }
}
```

**Nota:** `actionLabel` só funciona se `action` estiver definido no nível raiz do payload.

### Push + Email simultâneos (recomendado para máximo alcance)
```json
"channels": {
  "pushNotification": {
    "title": "Pesquisa de Satisfação",
    "body": "Toque para responder a pesquisa da sua escola."
  },
  "email": {
    "title": "Pesquisa de Satisfação",
    "body": "Queremos ouvir sua opinião! Clique abaixo para responder.",
    "actionLabel": "Responder Pesquisa"
  }
}
```

---

## Agendamento

Para envio futuro, adicionar `scheduleDate` em ISO 8601:

```json
"scheduleDate": "2026-05-10T08:00:00-03:00"
```

Para envio imediato, omitir o campo.

---

## Exemplo completo — disparo para toda a comunidade

```bash
curl -X POST https://api.layers.digital/v2/notification/send \
  -H "Authorization: Bearer $LAYERS_API_TOKEN" \
  -H "community-id: uniao" \
  -H "Content-Type: application/json" \
  -d '{
    "targets": {
      "topics": [{"kind": "group", "alias": "all"}],
      "roles": ["guardian"]
    },
    "title": "Pesquisa de Satisfação",
    "body": "Queremos ouvir sua opinião sobre o Colégio União!",
    "action": {
      "type": "portal",
      "portalAlias": "@raizeducacao:pesquisa",
      "path": "/"
    },
    "channels": {
      "pushNotification": {
        "title": "Pesquisa de Satisfação",
        "body": "Leva menos de 5 minutos. Toque para responder!"
      },
      "email": {
        "title": "Pesquisa de Satisfação — Colégio União",
        "body": "Queremos ouvir sua opinião sobre a escola do seu filho.",
        "actionLabel": "Responder Pesquisa"
      }
    }
  }'
```

---

## Configuração do projeto

### Variáveis de ambiente

```
LAYERS_API_TOKEN=eyJhbGciOiJI...   # mesmo token da Hub API
NEXT_PUBLIC_LAYERS_APP_ID=m3jzq5s00b
```

### Dados fixos confirmados

| Dado | Valor |
|---|---|
| portalAlias | `@raizeducacao:pesquisa` |
| App ID | `m3jzq5s00b` |
| Canais habilitados no manifesto | `email`, `pushNotification` |
| Instalações ativas | `raizeducacao`, `uniao` |

---

## Resposta da API

**Sucesso:**
```json
{"success": true}
```
HTTP 200

**Erro de validação:**
```json
{"errors": "...", "status": 400, "name": "BadRequest", "type": "ValidationError", "error": "Existem campos inválidos"}
```

**Erro de permissão de canal (manifesto não configurado):**
```json
{"status": 400, "name": "BadRequest", "type": "_BadRequest", "error": "Types pushNotification are not allowed for app"}
```
Solução: adicionar `"pushNotification"` ao array `channels` no manifesto do app.

---

## Erros encontrados durante implementação e soluções

| Erro | Causa | Solução |
|---|---|---|
| `"Types pushNotification are not allowed for app"` | `channels: []` no manifesto | Adicionar `"pushNotification"` ao array no manifesto |
| `"Types email are not allowed for app"` | `channels: []` no manifesto | Adicionar `"email"` ao array no manifesto |
| `action.portalAlias Required` | Campo obrigatório ao usar `type: "portal"` | Sempre incluir `portalAlias` junto com `type: "portal"` |
| Notificação abre em URL 404 no Layers | `path` com rota interna do Next.js (ex: `/p/csat`) | Usar `path: "/"` — deixar o portal resolver cuidar do redirecionamento |
