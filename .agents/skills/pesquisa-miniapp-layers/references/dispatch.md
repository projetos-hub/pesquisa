# Templates, comunicados e disparos

## Escolher o canal
- Layers nativo: usar `survey_dispatches`, jobs e processador do app.
- Simbiose: invocar `$simbiose-disparo`; nao duplicar sessao ou payload.
- Comunicado/post: usar `comunicados` e integracao Layers Posts.

## Preflight final
Exibir pesquisa, texto por canal, links, variaveis, perfis, escopo, IDs, quantidade estimada, exclusoes, deduplicacao, agenda, personalizacao, `only_unnotified`, grupos e lotes.

Validar:
- escopos `all`, `communities`, `group` ou `sample`;
- canais `pushNotification` e/ou `email`;
- perfis `guardian`, `student` e/ou `admin` conforme o fluxo;
- `sample` personalizado e somente com usuarios resolvidos;
- `all`/`communities` personalizados para auditoria por usuario;
- `only_unnotified` somente personalizado;
- encoding e links por comunidade;
- jobs sem duplicacao e retries abaixo do limite.

## Execucao
Criar um job por comunidade. Confirmar timezone no agendamento. Para imediato, acompanhar ate fechamento; aceite HTTP nao prova entrega final.

Usar checkpoint e retomar apenas jobs elegiveis. Nao reenviar sucessos quando `only_unnotified` estiver ativo.
