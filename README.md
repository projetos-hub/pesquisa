# Pesquisa de Satisfação — Mini App para Layers

Mini app React para ser embutido como **iFrame** dentro do app escolar da [Layers Education](https://layers.education).

## Funcionalidades

- ✅ Formulário multi-step com barra de progresso
- ✅ Pergunta de identificação (perfil / unidade / segmento)
- ✅ NPS (escala 1–5) + detecção de usuário bilíngue
- ✅ Bloco condicional: avaliação do programa bilíngue (só exibido se participante)
- ✅ 3 eixos de avaliação por escala 1–5 (Pedagógico, Administrativo, Infraestrutura)
- ✅ Envio para API da Layers com contexto de usuário
- ✅ Tela de erro com retry e tela de agradecimento

---

## Como rodar localmente

```bash
cd survey-layers-app
npm install
npm run dev
```

Acesse: http://localhost:5173

---

## Como configurar para produção

### 1. Configure a API da Layers

Edite `src/api/layers.js` e preencha:

```js
const LAYERS_API_URL = 'https://api.layers.education'
const COMMUNITY_SLUG = 'nome-da-sua-comunidade'
const SURVEY_ALIAS  = 'csat-bilingue-2025'
```

Consulte a documentação da Layers para obter o endpoint correto de submissão de pesquisas.

### 2. Ajuste as opções de unidade

Em `src/components/IdentificationStep.jsx`, substitua `['Unidade A', 'Unidade B', 'Unidade C']` pelas unidades reais da escola.

### 3. Build

```bash
npm run build
```

Os arquivos de produção ficarão em `dist/`.

### 4. Hospedagem

Faça o deploy da pasta `dist/` em qualquer serviço estático:
- **Vercel** (recomendado): `vercel --prod`
- **Netlify**: arraste a pasta `dist/` no painel
- **GitHub Pages**: configure o build action

### 5. Embed no Layers

No painel da Layers, crie um novo **Mini App** do tipo iFrame e defina a URL:

```
https://SEU_DOMINIO.vercel.app?userId={{userId}}&communityId={{communityId}}&token={{token}}
```

A Layers substituirá `{{userId}}`, `{{communityId}}` e `{{token}}` automaticamente com os dados da sessão do usuário.

---

## Estrutura do projeto

```
src/
├── api/
│   └── layers.js          # Integração com API da Layers
├── components/
│   ├── ProgressBar.jsx
│   ├── IdentificationStep.jsx
│   ├── NPSStep.jsx
│   ├── BilingualStep.jsx  # Step condicional (programa bilíngue)
│   ├── ScaleStep.jsx      # Reutilizável para os 3 eixos
│   ├── ThankYou.jsx
│   └── ErrorScreen.jsx
├── App.jsx                # Orquestrador de steps e lógica de submit
├── App.css                # Estilos globais
├── index.css
└── main.jsx
```

---

## Personalização

| O que mudar | Onde |
|---|---|
| Logo da escola | Coloque `logo.png` em `public/` |
| Cores e fonte | `src/App.css` (variáveis de gradiente) |
| Unidades | `IdentificationStep.jsx` |
| Aspectos avaliados | `App.jsx` (props dos ScaleStep) |
| Endpoint da API | `src/api/layers.js` |
