# Catalogo de capacidades

## Pesquisa e conteudo
- Listar, inspecionar, criar, editar, duplicar e excluir pesquisas.
- Alterar slug, titulo, tipo, publico, controle de acesso, status e datas.
- Criar, editar, ordenar e excluir perguntas e opcoes.
- Administrar welcome, thankyou, NPS, escalas, radio, checkbox, texto e upload.
- Configurar fluxo, condicionais, alinhamento, placeholders e respostas corretas.

## Comunidades
- Listar identidade por `community_id`, marca e unidade.
- Instalar/desinstalar pesquisa por comunidade.
- Ativar, pausar, encerrar ou deixar nao aberta por unidade.
- Definir datas, cores, logo, link de indicacao e textos substitutos.
- Resolver selecao hierarquica marca -> unidades em IDs concretos.

## Amostras
- Auditar XLSX/CSV, cabecalhos, e-mails, duplicatas e encoding.
- Mapear `CODCOLIGADA`/`CODFILIAL`, nome fantasia ou `community_id`.
- Importar em append/replace, criar grupos e gerir membros.
- Resolver `layers_user_id` e filtrar quem ainda nao foi notificado.

## Comunicacao
- Criar templates, previews e comunicados.
- Disparar push/e-mail por comunidades, grupos ou amostra.
- Personalizar, agendar, processar lotes, retentar e cancelar.
- Operar Simbiose pela skill `$simbiose-disparo`.

## Dados e operacao
- Consultar respostas, funil, timeline, comunidades e indicadores.
- Exportar XLSX/CSV/JSON e criar links publicos escopados.
- Auditar jobs, tentativas, logs e sincronizacao Sheets.
- Executar health check, quality gates, deploy e smoke test.

Use `python <SKILL_DIR>/scripts/pesquisa_cli.py capabilities --json` para o catalogo legivel por maquina. Resolva `<SKILL_DIR>` pela localizacao do `SKILL.md`, nunca pelo diretorio atual.
