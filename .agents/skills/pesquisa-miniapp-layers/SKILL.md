---
name: pesquisa-miniapp-layers
description: Operar externamente o Miniapp Layers de pesquisas da Raiz por uma API HTTPS autenticada e uma chave pessoal PESQUISA_API_TOKEN, incluindo pesquisas, perguntas, comunidades, marcas/unidades, amostras, templates, comunicados, disparos, links, respostas, relatorios e auditoria. Usar a partir de qualquer projeto, pasta ou computador, sem clonar o repositorio e sem acesso a Supabase Service Role ou tokens da Layers.
---

# Pesquisa Miniapp Layers

Operar exclusivamente pela API externa do app. Nao procurar `AGENTS.md`, `survey-platform`, `.env.local` nem arquivos do repositorio.

## Localizar os scripts

Resolver `SKILL_DIR` como a pasta que contem este `SKILL.md`. Sempre invocar scripts por caminho absoluto, por exemplo `python <SKILL_DIR>/scripts/external_client.py doctor`. Nunca assumir que o terminal esta dentro da skill ou do projeto.

Para instalar uma copia recebida no perfil global do Codex, executar uma vez:

```powershell
python .\scripts\install_skill.py
```

A instalacao padrao fica em `%CODEX_HOME%\skills\pesquisa-miniapp-layers` ou `%USERPROFILE%\.codex\skills\pesquisa-miniapp-layers`. Depois disso, a skill funciona em qualquer workspace; a pasta do projeto pode estar ausente.

## Configurar uma vez

Opcao recomendada: iniciar o terminal/Codex com a chave pessoal no ambiente. A URL de producao ja e o padrao:

```powershell
$env:PESQUISA_API_TOKEN = Read-Host 'PESQUISA_API_TOKEN' -MaskInput
```

Opcionalmente definir `PESQUISA_API_URL` para preview/local. O ambiente tem precedencia sobre a configuracao local.

Se ainda nao houver uma chave, executar no terminal usando o caminho absoluto resolvido da skill:

```powershell
python <SKILL_DIR>/scripts/external_client.py setup --email colaborador@raizeducacao.com.br
```

O comando solicita a senha do painel sem salva-la, autentica no Supabase e emite um token pessoal sem expiracao por padrao e revogavel a qualquer momento. O token fica fora da pasta da skill, no perfil local do usuario. Use `--expires-days N` apenas quando quiser uma chave temporaria.

Nunca copiar token para chat, plano, commit ou pacote da skill.

## Comecar cada tarefa

1. Executar `python <SKILL_DIR>/scripts/external_client.py doctor`.
2. Identificar recurso, alvo, risco e contagens.
3. Consultar em dry-run antes de qualquer escrita.
4. Validar encoding, IDs de comunidade, links e variaveis.
5. Aplicar com idempotencia; para exclusao/disparo, usar confirmacao explicita retornada pela API.
6. Reconsultar e comparar o resultado.

## Executar

Leitura:

```powershell
python <SKILL_DIR>/scripts/external_client.py execute --operation resource.list --resource surveys
```

Dry-run de escrita:

```powershell
python <SKILL_DIR>/scripts/external_client.py execute --operation resource.update --resource surveys --id UUID --data-file alteracao.json
```

Aplicacao:

```powershell
python <SKILL_DIR>/scripts/external_client.py execute --operation resource.update --resource surveys --id UUID --data-file alteracao.json --apply
```

Para operacoes destrutivas ou externas, repetir exatamente o valor `expectedConfirmation` devolvido pela API em `--confirm`.

## Rotear

- Pesquisas/perguntas: ler `references/surveys.md`.
- Marcas/unidades/comunidades: ler `references/communities.md`.
- Amostras: ler `references/samples.md`; usar `$spreadsheets` para transformar XLSX.
- Disparos: ler `references/dispatch.md`; usar `$simbiose-disparo` quando o canal for Simbiose.
- Links/relatorios: ler `references/reporting.md`.
- Contrato externo: ler `references/external-api.md`.
- Exclusao, PII ou envio: ler `references/safety.md`.

## Regras

- Nao usar Supabase Service Role, LAYERS_API_TOKEN, CRON_SECRET ou token Simbiose no cliente.
- Nao executar operacao fora da whitelist publicada por `/api/ops/v1/capabilities`.
- Usar dry-run como padrao.
- Exigir `Idempotency-Key` em escrita.
- Resolver marca/unidade para IDs concretos antes de confirmar.
- Usar `include_pii=false` por padrao.
- Usar lotes de no maximo 500 na API e checkpoint acima de 1000.
- Para Simbiose, preservar todas as regras de confirmacao da skill especializada.
- Tratar aceite HTTP como aceite da API, nao como entrega final de notificacao.

## Distribuir

Distribuicao publica ou versionada: compartilhar apenas a pasta da skill, sem configuracao, token, `.env`, planilhas ou logs. Cada colaborador emite sua propria chave, permitindo revogacao e auditoria individual.

Distribuicao privada gerenciada: um pacote fora do Git pode conter `bootstrap.json` com uma chave compartilhada. O instalador grava a configuracao no perfil local e remove o bootstrap da pasta extraida. Nunca commitar esse arquivo; enviar o ZIP por canal restrito e exclui-lo apos a instalacao. Todos os destinatarios compartilham a mesma identidade de auditoria e a revogacao interrompe o acesso de todos.
