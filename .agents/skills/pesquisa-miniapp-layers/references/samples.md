# Amostras

## Auditoria obrigatoria
Executar `sample-audit` antes e depois. Relatar arquivo/aba, cabecalhos, linhas, e-mails vazios/invalidos/duplicados, comunidades mapeadas, distribuicao por codigos, encoding e totais de append/replace.

## Importacao
- Preservar original e gerar novo artefato.
- Normalizar e-mail em lowercase e trim.
- Deduplicar por pesquisa + comunidade + e-mail.
- Nunca inventar `community_id`; usar alias existente ou registrar divergencia.
- Usar lotes de ate 100 e checkpoint acima de 1000.
- Em `replace`, exportar backup e comparar contagem antes de excluir.
- `NOT_FOUND` nao e usuario resolvido.

## Grupos
Validar que cada `sample_id` pertence a pesquisa do grupo. Exibir tamanho e distribuicao por comunidade antes do disparo.
