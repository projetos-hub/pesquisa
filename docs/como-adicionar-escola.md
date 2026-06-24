# Como adicionar uma nova escola autorizada

## Onde fica a lista

As escolas autorizadas ficam em `surveys.settings.allowed_communities` no Supabase.
Cada escola e identificada pelo seu `communityId` sem `@`.

## Adicionar uma escola nova

No Supabase SQL Editor:

```sql
UPDATE surveys
SET settings = jsonb_set(
  settings,
  '{allowed_communities}',
  (settings->'allowed_communities') || jsonb_build_array('ID-DA-NOVA-ESCOLA')
)
WHERE slug = 'csat';
```

Substitua `ID-DA-NOVA-ESCOLA` pelo communityId real.

## Remover uma escola

```sql
UPDATE surveys
SET settings = jsonb_set(
  settings,
  '{allowed_communities}',
  (settings->'allowed_communities') - 'ID-DA-ESCOLA'
)
WHERE slug = 'csat';
```

## Ver a lista atual

```sql
SELECT settings->'allowed_communities' FROM surveys WHERE slug = 'csat';
```

## Lista atual de escolas autorizadas

| communityId | Escola |
|---|---|
| americano | Colegio Americano Bilingue |
| yf24y2k7 | Apogeu Global School Cidade Alta |
| fwnash24 | Apogeu Global School Ferreira Guimaraes |
| apogeu-santoantonio-i | Apogeu Santo Antonio I |
| apogeu-santoantonio-ii | Apogeu Santo Antonio II |
| wmfkn49h | Apogeu Zona Norte |
| ns8z5w8m | Cubo Global School Botafogo |
| yxak8s0k | Cubo Global School Bosque Marapendi |
| k4ys44r2 | Cubo Global School Barra Golf |
| leonardodavinci-alfa | Colegio Leonardo da Vinci Alfa |
| leonardodavinci-beta | Colegio Leonardo da Vinci Beta |
| leonardodavinci-gama | Colegio Leonardo da Vinci Gama |
| n6k47n81 | Global Tree Botafogo / Bom Tempo |
| w9593n19 | Global Tree Barra Golf |
| rf3zk695 | Global Tree Peninsula |
| w95k0s77 | Global Tree Rio 2 |
| globaltree-abm | Global Tree Bosque Marapendi |
| matriz-bangu | Matriz Bangu |
| matriz-campogrande | Matriz Campo Grande |
| matriz-caxias | Matriz Caxias |
| matriz-madureira | Matriz Madureira |
| matriz-novaiguacu | Matriz Nova Iguacu |
| matriz-rochamiranda | Matriz Rocha Miranda |
| matriz-retirodosartistas | Matriz Retiro dos Artistas |
| matriz-saojoaodemeriti | Matriz Sao Joao de Meriti |
| matriz-taquara | Matriz Taquara |
| matriz-tijuca | Matriz Tijuca |
| qi-botafogo | Qi Botafogo |
| qi-freguesia | Qi Freguesia |
| qi-metropolitano | Qi Metropolitano |
| qi-recreio | Qi Recreio |
| qi-rio2 | Qi Rio 2 |
| qi-tijuca | Qi Tijuca |
| az51800x | Qi Valqueire |
| w213sfza | Sa Pereira Infantil e 1o ano |
| xa7y5zam | Sa Pereira Fundamental e Medio |
| sap | Escola SAP |
| sarahdawsey-juizdefora | Sarah Dawsey Juiz de Fora |
| y9490m37 | Sarah Dawsey Tijuca |
| uniao | Colegio Uniao |
| unificado-zonasul | Colegio Unificado Zona Sul |

## Aliases de importacao/amostra

Quando uma planilha ou export TOTVS traz o nome formal da escola, o sistema resolve esse texto para `community_id` em:

```text
survey-platform/lib/community-mapping.ts
```

Regra: se o nome importado representa uma comunidade ja existente, adicionar alias no mapeamento. Nao criar uma comunidade nova so porque o nome veio diferente na planilha.

Casos recentes:

| Nome importado | communityId |
|---|---|
| BOM TEMPO CRECHE E EDUCACAO INFANTIL LTDA | `n6k47n81` |
| COLEGIO QI BOTAFOGO | `qi-botafogo` |
| COLEGIO AMERICANO | `americano` |
| COLEGIOS INTEGRADOS LEONARDO DA VINCI - GAMA | `leonardodavinci-gama` |
| COLEGIO E CURSO MATRIZ EDUCACAO DUQUE DE CAXIAS | `matriz-caxias` |
| COLEGIO E CURSO AO CUBO BOTAFOGO | `ns8z5w8m` |
| COLEGIO E CURSO AO CUBO BARRA | `yxak8s0k` |
| COLEGIO E CURSO CUBO BARRA GOLFE | `k4ys44r2` |
| ESCOLA SA PEREIRA S.A. CAPISTRANO | `w213sfza` |
