# Marcas, unidades e comunidades

`communities` e a fonte da identidade. `survey_communities` representa a instalacao.

## Selecao marca -> unidades
1. Buscar comunidades da marca.
2. Exibir unidades como selecao expansivel.
3. Transformar a selecao em lista imutavel de `community_id`.
4. Guardar IDs concretos no plano e escopo.
5. Nao recalcular o alvo durante execucao confirmada.

## Textos por comunidade
Overrides em `survey_communities.settings.contentOverrides`:
- `questions[question.key].title`
- `questions[question.key].description`
- `questions[question.key].pergunta`
- `thankyou.message`

Campos vazios herdam o global. Usar placeholders suportados; nao substituir marca por `colegio/escola/creche`.

## Verificacao
Abrir unidade alterada e outra nao alterada. Conferir nome, genero textual, logo, cores, datas, status e indicacao.
