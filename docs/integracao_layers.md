# Plano Técnico — Integração Layers

---

## Frente 1 — Embed no Portal

### O que já está implementado
- `LayersPortal.js` carregado com `strategy="beforeInteractive"`
- `connectedPromise` com timeout de 5s
- Captura de `communityId`, `userId`, `accountId`, `session`
- `/portal` resolve a pesquisa ativa e redireciona para `/p/[slug]`

### Fluxo de dados
```
Layers iframe → carrega /portal
  → LayersPortal.js conecta
  → connectedPromise resolve
  → captura communityId
  → GET /api/portal/resolve?communityId=X
  → redireciona para /p/csat?communityId=X&userId=Y
  → SurveyRunner carrega pesquisa + valida acesso
```

### O que precisa de confirmação com a Layers

| Ponto | Situação |
|-------|----------|
| `insidePortalOnly: false` | Está assim para dev. Em produção provavelmente deve ser `true` — confirmar |
| URL de entry point do iframe | `/portal` ou `/p/csat` diretamente? Depende do que o AppMaker aceita |
| O que o campo `session` contém | Não documentado — testar se vem preenchido no iframe real |

### Risco principal
Timeout de 5s no `connectedPromise` pode ser curto em conexões móveis lentas. Pode precisar de ajuste.

---

## Frente 2 — Instalação via AppMaker API

### Variáveis já disponíveis no projeto
```
NEXT_PUBLIC_LAYERS_APP_ID = m3jzq5s00b
LAYERS_API_TOKEN = [configurado]
```

### O que `updateInstallation` precisa configurar

| Campo | Valor esperado | Situação |
|-------|---------------|----------|
| `location` | URL do iframe → `https://[dominio]/portal` | Definível agora |
| `origins` | `https://*.layers.education` | Já no CSP do next.config.ts |
| `title` | "Pesquisa de Satisfação" | Definível agora |
| `alias` | ex: `pesquisa-csat` | Definível agora |
| `placement` | onde aparece no portal (menu, card, home?) | **Precisa confirmar com Layers** |

### Sequência recomendada
```
1. getInstallation → diagnóstico do estado atual
2. updateInstallation → ajustar location, origins, title, alias
3. approve → se necessário para ativar
```

### O que depende da Layers
- Endpoint exato da AppMaker API
- Valores válidos para `placement`
- Se `approve` é obrigatório ou automático
- Como funciona o ciclo de publicação (draft → review → live?)

---

## Frente 3 — Dados e Notificações

### Mapeamento das fontes disponíveis

| Fonte | O que fornece | Quando usar |
|-------|--------------|-------------|
| `LayersPortal.js` | userId, communityId, accountId, session do usuário logado | Já em uso — contexto da sessão |
| **AppMaker API** | Configuração e metadados da instalação | Frente 2 |
| **API Hub** | Dados de comunidades, turmas, usuários, matrículas | Notificações segmentadas |
| **Data Sync** | Sync bidirecional contínuo de dados estruturados | Caso de uso mais pesado — não necessário agora |
| **Notificações Layers** | Push/in-app para usuários da plataforma | Para lembrete de pesquisa |

### Arquitetura proposta para notificações
```
Vercel Cron (diário)
  → Busca no Supabase: comunidades com pesquisa ativa + sem resposta
  → Para cada comunidade:
      → Consulta API Hub: lista usuários com perfil = responsavel/aluno
      → Filtra quem ainda não respondeu (join com response_sessions)
      → POST API Notificações Layers: envia lembrete segmentado
      → Registra envio no Supabase (evita reenvio)
```

### O que podemos desenvolver agora
- Lógica de "quem não respondeu" no Supabase — já temos `response_sessions`
- Estrutura do cron job — já temos infraestrutura em `/api/cron/`
- Payload de notificação (rascunho de texto/template)

### O que depende de confirmação com a Layers

| Item | Dependência |
|------|-------------|
| Endpoint para enviar notificação | Action name da Layers |
| Formato do payload (userId? accountId? communityId?) | Documentação da API |
| Como listar usuários por comunidade/turma | API Hub — endpoints e escopos |
| Rate limits e cotas de notificação | Suporte Layers |
| Data Sync é necessário? | Depende do volume e frequência |

---

## Resumo: o que fazer agora vs. o que aguardar

### Podemos desenvolver imediatamente
- Ajustar `insidePortalOnly: true` para produção
- Montar script de `getInstallation` + `updateInstallation` com os campos conhecidos
- Estruturar cron de notificações (sem o disparo — só a lógica de quem notificar)
- Definir template de texto das notificações

### Aguardar confirmação com Layers
- Valores válidos de `placement` no AppMaker
- Endpoint e action name para envio de notificações
- Endpoints do API Hub para listar usuários/turmas por comunidade
- Comportamento real do campo `session` no LayersPortal.js
