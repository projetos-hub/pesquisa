# Como adicionar uma nova escola autorizada

## Onde fica a lista
As escolas autorizadas ficam em `surveys.settings.allowed_communities` no Supabase.
Cada escola é identificada pelo seu `communityId` (sem o `@`).

---

## Adicionar uma escola nova

No **Supabase → SQL Editor → New query**, rode:

```sql
UPDATE surveys
SET settings = jsonb_set(
  settings,
  '{allowed_communities}',
  (settings->'allowed_communities') || jsonb_build_array('ID-DA-NOVA-ESCOLA')
)
WHERE slug = 'csat';
```

Substitua `ID-DA-NOVA-ESCOLA` pelo communityId real (ex: `nova-escola-xyz`).

---

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

---

## Ver a lista atual

```sql
SELECT settings->'allowed_communities' FROM surveys WHERE slug = 'csat';
```

---

## Lista atual de escolas autorizadas

| communityId | Escola |
|---|---|
| americano | Colégio Americano Bilíngue |
| yf24y2k7 | Apogeu Global School Cidade Alta |
| fwnash24 | Apogeu Global School Ferreira Guimarães |
| apogeu-santoantonio-i | Apogeu Santo Antônio I |
| apogeu-santoantonio-ii | Apogeu Santo Antônio II |
| wmfkn49h | Apogeu Zona Norte |
| ns8z5w8m | Cubo Global School Botafogo |
| yxak8s0k | Cubo Global School Bosque Marapendi |
| k4ys44r2 | Cubo Global School Barra Golf |
| leonardodavinci-alfa | Colégio Leonardo da Vinci Alfa |
| leonardodavinci-beta | Colégio Leonardo da Vinci Beta |
| leonardodavinci-gama | Colégio Leonardo da Vinci Gama |
| n6k47n81 | Global Tree Botafogo |
| w9593n19 | Global Tree Barra Golf |
| rf3zk695 | Global Tree Península |
| w95k0s77 | Global Tree Rio 2 |
| globaltree-abm | Global Tree Bosque Marapendi |
| matriz-bangu | Matriz Bangu |
| matriz-campogrande | Matriz Campo Grande |
| matriz-caxias | Matriz Caxias |
| matriz-madureira | Matriz Madureira |
| matriz-novaiguacu | Matriz Nova Iguaçu |
| matriz-rochamiranda | Matriz Rocha Miranda |
| matriz-retirodosartistas | Matriz Retiro dos Artistas |
| matriz-saojoaodemeriti | Matriz São João de Meriti |
| matriz-taquara | Matriz Taquara |
| matriz-tijuca | Matriz Tijuca |
| qi-freguesia | Qi Freguesia |
| qi-metropolitano | Qi Metropolitano |
| qi-recreio | Qi Recreio |
| qi-rio2 | Qi Rio 2 |
| qi-tijuca | Qi Tijuca |
| az51800x | Qi Valqueire |
| w213sfza | Sá Pereira Infantil e 1º ano |
| xa7y5zam | Sá Pereira Fundamental e Médio |
| sap | Escola SAP |
| sarahdawsey-juizdefora | Sarah Dawsey Juiz de Fora |
| y9490m37 | Sarah Dawsey Tijuca |
| uniao | Colégio União |
| unificado-zonasul | Colégio Unificado Zona Sul |
