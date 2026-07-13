# Errors Log

## 2026-07-07 — ag-09-depurar-erro

### Erro: Encoding quebrado e preview vazio no upload de amostra Excel

- **Sintoma:** tela de amostra exibia textos como `usuÃ¡rios`, `Ã¢...`; preview do arquivo TOTVS vinha com nome/escola vazios e email como marcador quebrado.
- **Causa raiz:** strings estaticas do fluxo de amostra estavam mojibakeadas; parser aceitava apenas `NOME`, `NOMEFANTASIA`, `EMAIL INSTITUCIONAL`, `EMAIL RESP FIN`, `EMAIL RESP ACAD`, mas a base real usa `ALUNO`, `FILIAL`, `EMAIL_ALUNO`, `EMAIL_RESP_FINANCEIRO`, `EMAIL_RESP_ACADEMICO`.
- **Tentativa 1:** leitura direta da planilha com SheetJS para comparar cabeçalhos e primeiras linhas -> arquivo estava legivel; problema estava no contrato de colunas/app.
- **Tentativa 2:** helper compartilhado de reparo/extracao e aliases de colunas -> preview e API passaram a usar o mesmo contrato.
- **Solução:** adicionados `sample-upload-text.ts` e `sample-excel.ts`, atualizados preview/API de amostra, textos estaticos do fluxo e aliases de comunidade para filiais da base.
- **Lição:** bases TOTVS de disparo podem variar nomes de coluna; o import precisa normalizar headers e aceitar aliases antes de declarar linha invalida.

## 2026-07-13 - ag-09-depurar-erro

### Erro: Disparo para comunidade inteira aceito pela Layers sem entrega observavel por usuario

- **Sintoma:** disparo para 6 comunidades Qi aparecia como `Enviado`, mas a tela mostrava `0/0 usuarios`; usuario presente em comunidades nao recebeu notificacao.
- **Causa raiz:** o modo nao personalizado para `all/communities` nao expandia destinatarios; ele enviava um unico payload `group=all` por comunidade para a Layers. A API retornava `{ success: true }`, mas isso so confirmava aceite do payload, sem auditoria por usuario. Alem disso, a busca personalizada de usuarios tratava resposta em array sem `total` como se o total fosse apenas a primeira pagina, podendo parar apos 75 usuarios.
- **Tentativa 1:** consulta ao banco do dispatch `7ffaf5e5-fb38-4cb6-85e0-f806db9ca1ee` -> jobs `sent`, `layers_response.success=true`, mas `auditCount=0` e `processed_users=0`.
- **Tentativa 2:** chamada direta a `/v1/users` nas comunidades Qi -> a API retornou paginas cheias de 75 usuarios e sem total confiavel; tambem misturou roles na resposta, exigindo filtro local por perfil.
- **Solucao:** bloquear novos disparos `all/communities` sem modo personalizado; deixar o formulario iniciar com personalizado ativo; corrigir `fetchCommunityUsers` para paginar enquanto vier pagina cheia e filtrar roles localmente; ajustar historico para nao renderizar disparos nao personalizados como `0/0 usuarios`.
- **Licao:** para comunidade inteira, nao confiar em `group=all` como entrega real. O caminho auditavel precisa expandir usuario a usuario e manter job `sending` enquanto a paginacao da Layers indicar mais paginas.
