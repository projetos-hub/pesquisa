# Manual de Retomada — Pesquisa de Satisfação 2026

## O que estamos construindo
Mini app de pesquisa de satisfação (CSAT + Bilíngue) para rodar dentro dos apps
escolares da Layers Education. Substitui o serviço de coleta que a Layers fazia
manualmente via Enquetes. As respostas vão para um Google Sheets e o disparo de
lembretes para quem não respondeu usa a infraestrutura de Comunicados já existente.

---

## Arquivo principal
```
C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app\pesquisa.html
```
Abrir direto no navegador (duplo clique) para visualizar.

---

## O que já está pronto

### Mini app (pesquisa.html)
- [x] Tela de boas-vindas com texto personalizado por perfil (responsável / aluno)
- [x] Dois textos diferentes: um para creche (Global Tree, Bom Tempo), outro para escola
- [x] NPS de 0 a 10
- [x] Fluxo condicional do programa bilíngue (só aparece se participante)
- [x] 3 eixos de avaliação: Pedagógico, Administrativo, Infraestrutura (escala 1–5)
- [x] Telas de encerramento personalizadas por perfil + NPS:
  - Responsável Promotor (9–10): agradecimento + link de indicação da escola
  - Responsável Neutro (7–8): agradecimento + link de indicação
  - Responsável Detrator (0–6): agradecimento + aviso de contato da equipe
  - Aluno Promotor/Neutro: agradecimento genérico
  - Aluno Detrator: agradecimento + abertura para diálogo
- [x] Links de indicação por escola (14 escolas mapeadas)
- [x] Tela "pesquisa ainda não aberta" (com data de abertura)
- [x] Tela "pesquisa encerrada" (com data de fechamento)
- [x] Campo `onda` para identificar 1º ou 2º semestre
- [x] Envio das respostas para Google Sheets via webhook

### Google Apps Script (google-apps-script.js)
- [x] Script completo para receber respostas e salvar no Sheets
- [x] Cria aba e cabeçalho automaticamente
- [x] Calcula segmento NPS (Promotor/Neutro/Detrator)

---

## O que está pendente


### 1. Ativar o Google Sheets (próximo passo imediato)
1. Acesse sheets.new
2. Extensões → Apps Script
3. Cole o conteúdo de `google-apps-script.js`
4. Implantar → Nova implantação → App da Web
   - Executar como: Eu
   - Quem tem acesso: Qualquer pessoa
5. Copie a URL gerada
6. No `pesquisa.html`, substitua `SUA_URL_DO_APPS_SCRIPT_AQUI` pela URL

### 2. Respostas pendentes da Layers
Duas perguntas enviadas para o suporte da Layers:

**Pergunta 1:**
> "O LayersPortal.js expõe no objeto `session` o nome do usuário, perfil
> (responsável/aluno), nome do aluno vinculado e turma/série?
> Quais campos exatamente estão disponíveis?"

**Pergunta 2:**
> "Consigo passar parâmetros fixos na URL de um portal iFrame por escola,
> como slug da escola e datas de abertura e fechamento?"

Quando chegar a resposta:
- Pergunta 1 → integrar o LayersPortal.js no mini app para pegar dados do
  usuário automaticamente (hoje vêm pela URL)
- Pergunta 2 → confirmar como configurar o portal por escola no painel da Layers

### 3. Configurar o portal na Layers
Após resposta da Layers, configurar o mini app como portal iFrame.
URL base com parâmetros por escola (exemplo escola Qi):
```
https://SEU_DOMINIO/pesquisa.html?school=qi&onda=1S2026&openDate=2026-03-01&closeDate=2026-06-30
```

### 4. Hospedar o mini app
O arquivo `pesquisa.html` precisa estar em uma URL pública.
Opções (todas gratuitas):
- Vercel: arrastar a pasta no vercel.com
- Netlify: arrastar a pasta no netlify.com
- GitHub Pages

---

## Parâmetros de URL por escola
Quando o admin configurar o portal na Layers, a URL deve conter:

| Parâmetro | O que é | Exemplo |
|---|---|---|
| `school` | Slug da escola | `qi`, `cubo`, `matriz` |
| `onda` | Qual pesquisa do ano | `1S2026` ou `2S2026` |
| `openDate` | Data de abertura | `2026-03-01` |
| `closeDate` | Data de fechamento | `2026-06-30` |
| `name` | Nome do usuário (via Layers) | `Ana Souza` |
| `studentName` | Nome do aluno (via Layers) | `Pedro Souza` |
| `grade` | Série/turma (via Layers) | `3º Fundamental` |
| `role` | Perfil (via Layers) | `responsavel` ou `aluno` |

---

## Slugs das escolas
| Escola | Slug |
|---|---|
| Cubo Global School | `cubo` |
| Apogeu | `apogeu` |
| Apogeu Global School | `apogeu-global` |
| CLV | `clv` |
| Global Tree | `global-tree` |
| Matriz | `matriz` |
| Qi | `qi` |
| Sá Pereira | `sa-pereira` |
| SAP | `sap` |
| Sarah Dawsey | `sarah-dawsey` |
| Unificado | `unificado` |
| Americano | `americano` |
| União | `uniao` |

> Bom Tempo e Global Tree = **creche** (textos adaptados automaticamente)
> Todas as outras = **escola**

---

## Fluxo completo de funcionamento

```
Admin configura portal na Layers com URL + parâmetros da escola
        ↓
Usuário abre o app da escola → vê o mini app
        ↓
Preenche a pesquisa → resposta enviada para Google Sheets
        ↓
Admin compara Sheets (quem respondeu) com lista Layers (quem deveria responder)
        ↓
Dispara lembrete via Comunicados só para quem não respondeu
        ↓
Pesquisa fecha na data configurada → tela de encerrada aparece automaticamente
```

---

## Colunas do Google Sheets
```
data_resposta | onda | escola | tipo | perfil | nome_responsavel |
nome_aluno | serie | user_id | nps | segmento_nps | participa_bilingue |
bil_ingles_qualidade_programa | bil_ingles_integracao_clil |
bil_ingles_desenvolvimento_habilidades | bil_turno_qualidade_projeto |
bil_turno_quantidade_aulas | bil_turno_uso_espacos |
ped_qualidade_ensino | ped_recursos_pedagogicos | ped_acolhimento_emocional |
adm_gestao_organizacao | adm_atendimento_publico | adm_canais_digitais |
inf_conforto_seguranca | inf_higiene_conservacao | inf_alimentacao_servicos
```

---

## Como retomar com o assistente
Cole esta mensagem no início da conversa:

> "Estou desenvolvendo um mini app de pesquisa de satisfação para a Layers
> Education. Tenho um arquivo MANUAL-RETOMADA.md com todo o contexto do projeto.
> O arquivo do mini app fica em C:\Users\luisa.lopes\Desktop\EXP IA\survey-layers-app\pesquisa.html
> e o script do Google Sheets em google-apps-script.js na mesma pasta.
> Vamos continuar de onde paramos."
