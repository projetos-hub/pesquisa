# Errors Log

## 2026-07-07 — ag-09-depurar-erro

### Erro: Encoding quebrado e preview vazio no upload de amostra Excel

- **Sintoma:** tela de amostra exibia textos como `usuÃ¡rios`, `Ã¢...`; preview do arquivo TOTVS vinha com nome/escola vazios e email como marcador quebrado.
- **Causa raiz:** strings estaticas do fluxo de amostra estavam mojibakeadas; parser aceitava apenas `NOME`, `NOMEFANTASIA`, `EMAIL INSTITUCIONAL`, `EMAIL RESP FIN`, `EMAIL RESP ACAD`, mas a base real usa `ALUNO`, `FILIAL`, `EMAIL_ALUNO`, `EMAIL_RESP_FINANCEIRO`, `EMAIL_RESP_ACADEMICO`.
- **Tentativa 1:** leitura direta da planilha com SheetJS para comparar cabeçalhos e primeiras linhas -> arquivo estava legivel; problema estava no contrato de colunas/app.
- **Tentativa 2:** helper compartilhado de reparo/extracao e aliases de colunas -> preview e API passaram a usar o mesmo contrato.
- **Solução:** adicionados `sample-upload-text.ts` e `sample-excel.ts`, atualizados preview/API de amostra, textos estaticos do fluxo e aliases de comunidade para filiais da base.
- **Lição:** bases TOTVS de disparo podem variar nomes de coluna; o import precisa normalizar headers e aceitar aliases antes de declarar linha invalida.
