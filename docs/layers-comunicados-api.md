# Layers Comunicados API — Referência Técnica

Fonte: https://developers.layers.education/content/communication/comunicados/
Pesquisado em: 2026-06-02

---

## Resumo executivo

**Comunicados** é um módulo da Suíte de Comunicação da Layers, distinto das notificações push/email.
Enquanto notificações são disparadas (push model), comunicados funcionam como um **feed tipo bulletin board**
que os usuários acessam ativamente no portal.

A integração segue o padrão **API Hub / Provider Model**: a Layers "puxa" as publicações do seu app,
não o contrário. O seu sistema precisa expor um endpoint HTTP que a Layers chama periodicamente.

---

## Arquitetura: como o modelo de provedor funciona

```
[Layers App "Comunicados"] ──pergunta──► [Seu endpoint: POST /layers/actions/@layers:Posts:getUpdatedAfter]
                                               │
                           Layers envia         │  Layers envia: limit, after, context, secret
                           para o usuário       │
                           as publicações       ◄─── Você retorna: { result: [ ...publicações ] }
```

O fluxo completo:

1. Usuário abre o app Comunicados no portal Layers
2. A Layers descobre quais apps provedores estão registrados para a comunidade (via `GET /v1/services/discover/@layers:Posts:getUpdatedAfter`)
3. A Layers envia `POST` para o endpoint registrado no seu app, passando `limit` e `after`
4. Seu servidor retorna as publicações atualizadas desde `after`
5. A Layers exibe essas publicações no feed do usuário

---

## Endpoints envolvidos

### 1. Endpoint que VOCÊ implementa (recebe chamada da Layers)

```
POST https://seu-app.com/v1/layers/actions/@layers:Posts:getUpdatedAfter
```

O caminho `/v1/layers/actions/{{action}}` é o padrão recomendado pela Layers para ações do API Hub,
mas pode ser configurado de forma personalizada no manifesto do app.

### 2. Endpoint da Layers para descoberta (você consome, opcional)

```
GET https://api.layers.digital/v1/services/discover/@layers:Posts:getUpdatedAfter
```

Headers:
```
Authorization: Bearer {LAYERS_API_TOKEN}
Community-Id: {communityId}
```

Retorna array de provedores disponíveis para a action naquela comunidade.

### 3. Endpoint da Layers para invocar manualmente (você consome, opcional)

```
POST https://api.layers.digital/v1/services/call/@layers:Posts:getUpdatedAfter/{id_app_provedor}
```

Headers:
```
Authorization: Bearer {LAYERS_API_TOKEN}
Community-Id: {communityId}
Content-Type: application/json
```

---

## Payload recebido pela Layers no seu endpoint

A Layers enviará `POST` com o seguinte body:

```json
{
  "limit": 10,
  "after": "2026-05-01T00:00:00.000Z",
  "context": {
    "issuedAt": "2026-06-02T14:30:00.000Z",
    "action": "@layers:Posts:getUpdatedAfter",
    "community": "uniao",
    "secret": "seu-secret-configurado-no-manifesto"
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `limit` | integer | Sim | Quantidade máxima de publicações a retornar |
| `after` | date-time (ISO 8601) | Sim | Retornar publicações com `updatedAt >= after` |
| `context.issuedAt` | date-time | Sim | Timestamp do momento da requisição |
| `context.action` | string | Sim | Sempre `@layers:Posts:getUpdatedAfter` |
| `context.community` | string | Sim | Identificador da comunidade (ex: `uniao`) |
| `context.secret` | string | Não | Chave secreta para validar autenticidade |

**Validação recomendada:** verificar `context.secret === LAYERS_WEBHOOK_SECRET` configurado no manifesto.

---

## Payload que seu endpoint deve retornar

```json
{
  "result": [
    {
      "id": "comunicado-001",
      "title": "Início do Ano Letivo 2026",
      "description": "Informamos que as aulas do ano letivo 2026 terão início no dia 10 de fevereiro...",
      "createdAt": "2026-01-15T09:00:00.000Z",
      "updatedAt": "2026-01-15T09:00:00.000Z",
      "category": "Geral",
      "targets": {
        "users": [],
        "members": [],
        "groups": ["all"]
      },
      "author": {
        "name": "Direção Escolar",
        "email": "direcao@escola.com.br",
        "alias": "direcao"
      },
      "attachments": [
        {
          "title": "Calendário Letivo 2026.pdf",
          "type": "file",
          "url": "https://storage.escola.com.br/calendario-2026.pdf"
        }
      ],
      "approved": true
    }
  ]
}
```

### Campos do objeto de publicação

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string | Sim | ID único no seu sistema |
| `title` | string | Sim | Título do comunicado |
| `description` | string | Sim | Corpo do comunicado (texto) |
| `createdAt` | date-time | Sim | Data de criação |
| `updatedAt` | date-time | Sim | Data da última atualização |
| `category` | string | Não | Categoria — deve ser pré-cadastrada na comunidade |
| `targets` | object | Sim | Quem recebe o comunicado (ver abaixo) |
| `author` | object | Não | Informações do autor |
| `attachments` | array | Não | Arquivos anexos (URLs HTTPS obrigatório) |
| `approved` | boolean | Não | `true` = publicar direto; `false` = aguardar aprovação |

### Schema do campo `targets`

```json
"targets": {
  "users":   ["userId1", "userId2"],
  "members": ["memberId1", "memberId2"],
  "groups":  ["all", "turma-3a"]
}
```

- `groups: ["all"]` → toda a comunidade
- `groups: ["turma-3a"]` → segmentar para turma específica
- `users` → usuários com login na Layers
- `members` → membros sem login (alunos menores, etc.)

### Schema dos anexos

```json
"attachments": [
  {
    "title": "nome-do-arquivo.pdf",
    "type": "file",
    "url": "https://storage.exemplo.com/arquivo.pdf"
  }
]
```

**Obrigatório**: URLs de anexos devem usar HTTPS.

---

## Autenticação

| Ponto | Detalhes |
|---|---|
| Layers → Seu endpoint | A Layers envia `context.secret` no body. Você valida no servidor |
| Você → Layers (discover/call) | `Authorization: Bearer {LAYERS_API_TOKEN}` + `Community-Id` |
| Token necessário | Mesmo token `auth:app` já usado no projeto (`LAYERS_API_TOKEN`) |

**Secret de webhook:** configurado no manifesto do app (AppMaker). Não é o mesmo que o `LAYERS_API_TOKEN`.
Precisa de uma variável de ambiente adicional, ex: `LAYERS_WEBHOOK_SECRET`.

---

## Registro no manifesto (AppMaker)

Para que a Layers passe a chamar seu endpoint, o app precisa declarar no manifesto que provê a action
`@layers:Posts:getUpdatedAfter`. Configuração no AppMaker → Meus Apps → Pesquisa → Manifesto.

Estrutura esperada (a ser confirmada com suporte Layers):

```json
"actions": {
  "provide": [
    {
      "action": "@layers:Posts:getUpdatedAfter",
      "endpoint": "https://pesquisa-nu-sand.vercel.app/api/layers/actions/posts",
      "secret": "seu-webhook-secret"
    }
  ]
}
```

**Status:** os campos exatos do manifesto para comunicados não estão documentados publicamente.
Precisa de confirmação com suporte Layers (ver seção "Pendências" abaixo).

---

## Constraint crítica: categorias

**Se uma publicação retornar uma `category` que não está pré-cadastrada na comunidade, ela não será sincronizada.**

As categorias de comunicados são configuradas no painel administrativo da comunidade na Layers, não via API.
Para contornar:
- Usar apenas categorias pré-cadastradas (ex: `"Geral"`, `"Financeiro"`, `"Pedagógico"`)
- Ou omitir o campo `category` (comportamento sem categoria — precisa validar se aceito)
- Confirmar com cada comunidade quais categorias estão cadastradas

---

## Comunicado vs. Notificação — quando usar cada um

| Critério | Notificação (`/v2/notification/send`) | Comunicado (`@layers:Posts:getUpdatedAfter`) |
|---|---|---|
| **Modelo** | Push: você envia ativamente | Pull: Layers puxa do seu servidor |
| **Onde aparece** | Push no celular + email | Feed "Comunicados" no portal/app Layers |
| **Iniciativa** | Seu sistema dispara quando quer | Layers consulta periodicamente |
| **Histórico** | Não fica em feed navegável | Fica disponível para leitura posterior |
| **Conteúdo rico** | Apenas título + body + CTA | Título + texto longo + anexos PDF/arquivo |
| **Segmentação** | `targets.topics` + `roles` | `targets.users/members/groups` |
| **Aprovação** | Imediato | Campo `approved: true/false` |
| **Agendamento** | `scheduleDate` | Controlado pelo `updatedAt` |
| **Implementação** | 1 chamada de API | Requer endpoint no seu servidor |
| **Manifesto** | `notification.channels` | Declaração de action provider |
| **Caso de uso** | Lembrete de pesquisa pendente | Publicar comunicados oficiais da escola |
| **Quando usar** | Alertas urgentes, convites pontuais | Avisos formais, informativos, circulares |

### Recomendação para o projeto

- **Disparar pesquisa:** usar Notificação (já implementado)
- **Publicar aviso "nova pesquisa disponível" no feed escolar:** usar Comunicados (a implementar)
- **Combinação ideal:** Comunicado no feed + Notificação push para alertar sobre o comunicado

---

## Implementação no projeto — o que seria necessário

Para implementar Comunicados no projeto de pesquisa:

1. **Criar endpoint:** `POST /api/layers/actions/posts` no Next.js que:
   - Valida `context.secret`
   - Lê pesquisas ativas do Supabase
   - Retorna publicações no formato Layers

2. **Registrar no manifesto:** declarar que o app provê `@layers:Posts:getUpdatedAfter`

3. **Gerenciar categorias:** confirmar quais categorias estão cadastradas em cada comunidade

4. **Variável de ambiente nova:** `LAYERS_WEBHOOK_SECRET`

Esforço estimado: 1-2 dias de desenvolvimento após confirmar pendências com a Layers.

---

## Pendências — o que precisa de confirmação com suporte Layers

| Item | Questão | Impacto |
|---|---|---|
| Manifesto | Campos exatos para declarar action provider de Comunicados | BLOQUEANTE |
| Categorias | Como listar as categorias pré-cadastradas de uma comunidade via API | Alto |
| `category` omitido | Comunicado sem categoria é sincronizado ou rejeitado? | Médio |
| `targets` vazio | Comportamento se `targets.groups = ["all"]` com arrays users/members vazios | Médio |
| Frequência de pull | Com que periodicidade a Layers chama `getUpdatedAfter`? | Médio |
| `approved: false` | Quem aprova? Via painel Layers ou via API? | Médio |
| Permissão extra | Token `auth:app` é suficiente para registrar como provedor de comunicados? | Baixo |

**Contato suporte Layers:** suporte@layers.education ou devs@layers.education

---

## Próximos passos se quiser implementar

1. **Contato imediato com Layers:** perguntar os campos do manifesto para `actions.provide`
2. **Testar localmente:** criar endpoint mock em `/api/layers/actions/posts` e verificar se a Layers chama
3. **Mapeamento de categorias:** levantar com cada escola quais categorias de comunicados estão cadastradas
4. **Implementar o provider:** buscar pesquisas ativas no Supabase e formatá-las como publicações

---

## Alternativa sem implementar provider

Se o objetivo for apenas **notificar** sobre pesquisas (não criar um feed permanente), a solução atual
de Notificações (`POST /v2/notification/send`) já atende. O Comunicado agrega valor em:

- Histórico navegável pelo responsável ("ver todos os comunicados anteriores")
- Conteúdo com anexos (PDF do termo de pesquisa, por exemplo)
- Publicação formal com identificação de autor e aprovação

Para o use case atual de pesquisa CSAT, a notificação push é suficiente.
Comunicados faria sentido se a Raiz quiser usar o mesmo app para enviar avisos gerais da escola.

---

## Referências

- Documentação Comunicados: https://developers.layers.education/content/communication/comunicados/
- Referência prover publicações: https://developers.layers.education/content/communication/comunicados/referencia/prover-publicacoes.html
- API Hub (arquitetura): https://developers.layers.education/content/api-hub/
- Guia consumindo actions: https://developers.layers.education/content/api-hub/guias/consumindo-actions.html
- Guia provendo dados: https://developers.layers.education/content/api-hub/guias/provendo-dados-action.html
- Notifications API (já implementada): `docs/layers-notifications.md`
