# Respostas, relatorios e links

## Relatorios
Usar rotas/servicos atuais para overview, perguntas, segmentos, comunidades, timeline, funil e auditoria. Paginar e conferir total independente.

## Exportacao
- Preferir gerador XLSX do app.
- CSV em UTF-8 com escaping.
- Remover PII quando nao indispensavel.
- Conferir cabecalhos, linhas, ultima resposta e taxa amostral.

## Links publicos
- Criar token e chave fortes.
- `include_pii=false` por padrao.
- Escopo `all` inclui tudo; `brands` persiste nomes e IDs concretos.
- Para unidade, persistir `communityIds` escolhidos e rotulo.
- Testar JSON/CSV/XLSX antes de compartilhar.
- Revogar ou rotacionar chave exposta.

Nunca registrar token e chave juntos em log ou auditoria.
