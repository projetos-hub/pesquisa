# Pesquisas e perguntas

## Preflight
1. Resolver a pesquisa por UUID e confirmar slug/titulo.
2. Ler perguntas e opcoes ordenadas.
3. Contar instalacoes, amostra, respostas e disparos.
4. Confirmar se muda template global ou override de comunidade.

## Regras
- Slug: minusculas, numeros e hifens; unico.
- Status: `rascunho`, `ativa`, `pausada` ou `encerrada`.
- Controle: `aberta` ou `amostra`.
- Abertura anterior ao encerramento; persistir ISO com timezone correto.
- Key: minusculas, numeros e underscore; unica na pesquisa.
- Tipos: `welcome`, `nps`, `scale`, `scale_sections`, `radio`, `text`, `thankyou`, `checkbox`, `file_upload`.
- Reordenacao deve manter `order_index` e invalidar cache `survey-config`.
- Duplicacao/exclusao deve usar as RPCs administrativas existentes.

## Verificacao
- Consultar configuracao publica por slug e comunidade.
- Validar ordem, options, condicionais e placeholders.
- Nao submeter resposta real sem usuario de teste autorizado.
