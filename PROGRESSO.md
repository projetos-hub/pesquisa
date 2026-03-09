# Progresso — Plataforma de Pesquisa Layers Education

## Como retomar com o assistente
Cole esta mensagem no início da próxima conversa:

> "Estou desenvolvendo uma plataforma de pesquisas de satisfação para a Layers Education.
> O projeto fica em C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app
> Repositório GitHub: https://github.com/projetos-hub/pesquisa.git
> Leia o arquivo PROGRESSO.md para entender onde paramos."

---

## O que é o projeto

Plataforma de pesquisas de satisfação para rodar dentro dos apps escolares da Layers Education (portal iFrame). As respostas vão para um Google Sheets via webhook (Google Apps Script).

---

## Arquivos principais

| Arquivo | O que é |
|---|---|
| `pesquisa.html` | Mini app React (monolítico, roda sem build) — arquivo principal de deploy |
| `google-apps-script.js` | Backend: recebe respostas e salva no Google Sheets |
| `MANUAL-RETOMADA.md` | Contexto completo do projeto (escolas, parâmetros, fluxo) |

---

## O que já está pronto

### pesquisa.html (versão atual — CSAT hardcoded)
- Tela de boas-vindas personalizada por perfil (responsável / aluno)
- NPS de 0 a 10
- Fluxo condicional bilíngue (só aparece se participante)
- 3 eixos de avaliação: Pedagógico, Administrativo, Infraestrutura (escala 1–5)
- Telas de encerramento personalizadas por perfil + segmento NPS
- Links de indicação por escola (13 escolas)
- Tela "pesquisa ainda não aberta" e "pesquisa encerrada"
- Envio de respostas para Google Sheets via webhook
- Integração com LayersPortal.js (userId, communityId)
- Fallback para testes via parâmetros de URL

### google-apps-script.js (versão atual — CSAT hardcoded)
- GET: retorna config da escola (onda, status, school, tipo)
- POST: salva resposta no Sheets com 28 colunas
- Mapa de 27 comunidades/escolas mapeadas
- Calcula segmento NPS (Promotor/Neutro/Detrator)
- Cria aba e cabeçalho automaticamente

### Infraestrutura
- Repositório GitHub: https://github.com/projetos-hub/pesquisa.git (branch main)
- **Regra:** sempre fazer commit + push após alterações

---

## Próximo passo: IMPLEMENTAR O PLANO APROVADO

### Objetivo
Transformar o app de uma pesquisa única (CSAT) em uma **plataforma multi-pesquisa** que suporte pesquisas quantitativas e qualitativas, direcionadas para responsáveis e/ou alunos.

### O que precisa ser feito em `pesquisa.html`

1. **Criar objeto `SURVEYS`** no topo do arquivo — registry de todas as pesquisas
2. **Migrar conteúdo CSAT** para `SURVEYS['csat']` (sem mudança visual para o usuário)
3. **Tornar o engine genérico**: o app lê `?surveyId=csat` na URL e renderiza os steps da pesquisa correspondente
4. **Suportar 6 tipos de step:**
   - `welcome` — tela de boas-vindas
   - `nps` — escala 0–10 + pergunta sim/não opcional
   - `scale` — perguntas Likert 1–5 (com seções opcionais)
   - `radio` — múltipla escolha (uma resposta)
   - `text` — campo de texto aberto (qualitativa)
   - `thankyou` — tela final
5. **Filtro por público:** cada survey declara `publico: ['responsavel', 'aluno']`
6. **Steps condicionais/restritos:** `condicional: (ans) => ...` e `somentePara: 'responsavel'`
7. **Notificação de erro:** se `surveyId` não encontrado → tela de erro + POST silencioso ao Apps Script

### O que precisa ser feito em `google-apps-script.js`

1. **Multi-survey no POST:** salvar em aba por surveyId (`Respostas_csat`, `Respostas_xxx`)
2. **Cabeçalho dinâmico:** criado automaticamente baseado nas chaves do payload
3. **Handler de erros:**
   - Aba `Erros` para logar cada ocorrência (timestamp, survey_id, community_id, user_id)
   - Enviar e-mail para `projetos@raizeducacao.com.br`
   - Assunto: `ERRO PESQUISA - [surveyId]`
   - Corpo: escola, usuário, data/hora, total de usuários afetados
   - Anti-spam: máximo 1 e-mail por hora por surveyId
4. **GET retorna surveyId** ativo junto com config da escola

### O que NÃO muda
- Visual e CSS
- Integração com LayersPortal
- Mapa das 27 escolas/comunidades
- Links de indicação por escola
- Textos das telas de obrigado
- Telas de prazo (não aberta / encerrada)

---

## Como testar após implementar

```
1. pesquisa.html?surveyId=csat&school=qi&role=responsavel&nome=Ana&studentName=Pedro&grade=3F
   → deve funcionar idêntico ao atual

2. pesquisa.html (sem surveyId)
   → deve carregar CSAT (fallback)

3. pesquisa.html?surveyId=inexistente
   → deve mostrar tela de erro + disparar POST de erro ao Apps Script

4. pesquisa.html?surveyId=csat&role=aluno
   → step bilíngue deve aparecer, links de indicação NÃO aparecem

5. Testar submit com webhook configurado
   → verificar aba Respostas_csat no Sheets
```

---

## Estrutura de URL por escola

```
pesquisa.html?surveyId=csat&communityId=qi-freguesia&onda=1S2026&openDate=2026-03-01&closeDate=2026-06-30
```

Parâmetros opcionais (quando não vier do LayersPortal):
- `nome` — nome do usuário
- `role` — `responsavel` ou `aluno`
- `studentName` — nome do aluno
- `grade` — série/turma
- `school` — slug da escola
- `tipo` — `escola` ou `creche`

---

## Pendências além do plano atual

1. **Ativar Google Sheets** — colar `google-apps-script.js` e substituir `SUA_URL_DO_APPS_SCRIPT_AQUI` no `pesquisa.html`
2. **Resposta da Layers** sobre campos do LayersPortal.js e passagem de parâmetros via URL de portal iFrame
3. **Hospedar pesquisa.html** — Vercel, Netlify ou GitHub Pages
4. **Configurar portal na Layers** após respostas acima
