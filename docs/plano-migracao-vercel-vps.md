# Plano de Migração: Vercel → VPS Hostinger

**Projeto:** survey-platform (pesquisa CSAT Raiz Educação)  
**App URL atual:** https://pesquisa-nu-sand.vercel.app  
**Stack:** Next.js 16 + React 19 + Tailwind CSS 4 + Supabase  
**Data do plano:** junho/2026

---

## Sumário

1. [O que muda e o que não muda](#1-o-que-muda-e-o-que-nao-muda)
2. [O que contratar na Hostinger](#2-o-que-contratar-na-hostinger)
3. [Setup inicial da VPS](#3-setup-inicial-da-vps)
4. [Deploy do app](#4-deploy-do-app)
5. [Domínio e HTTPS](#5-dominio-e-https)
6. [Substituir os Crons do Vercel](#6-substituir-os-crons-do-vercel)
7. [Substituir o CI/CD do Vercel](#7-substituir-o-cicd-do-vercel)
8. [Monitoramento básico](#8-monitoramento-basico)
9. [Checklist de migração](#9-checklist-de-migracao)
10. [Armadilhas comuns](#10-armadilhas-comuns)

---

## 1. O que muda e o que não muda

### Analogia para começar

Hoje o Vercel é como um apartamento mobiliado: você entra, joga o código na porta, e tudo funciona — energia, água, internet, segurança, tudo incluso e gerenciado por outra pessoa.

Uma VPS é como alugar um apartamento vazio: o espaço é seu, mas você instala os móveis, conecta a energia, configura a fechadura. Mais trabalho inicial, mais controle e custo menor a longo prazo.

---

### O que o Vercel fazia automaticamente que agora você vai fazer manual

| Funcionalidade | Vercel (automático) | VPS (você configura uma vez) |
|---|---|---|
| Build do app a cada push | Sim, automático | GitHub Actions (seção 7) |
| App sempre rodando | Sim, automático | PM2 (seção 4) |
| HTTPS/SSL | Sim, automático | Certbot/Let's Encrypt (seção 5) |
| Crons agendados | `vercel.json` → `cron` | crontab do Linux (seção 6) |
| Proxy reverso (porta 80/443) | Sim, transparente | Nginx (seção 3) |
| Logs de acesso | Dashboard Vercel | `pm2 logs` + arquivos em `/var/log/nginx` |
| Rollback | Um clique | `git checkout` + redeploy manual |

### O que NÃO muda

- **Supabase:** banco de dados externo, não move nada. As mesmas variáveis de ambiente continuam funcionando.
- **Código-fonte:** zero mudança no código do app. Nenhum arquivo de `.ts`/`.tsx` precisa ser alterado.
- **Domínio:** o endereço final (ex: `pesquisa.raizeducacao.com.br`) pode continuar o mesmo — só aponta para o IP da VPS em vez do Vercel.
- **Layers iFrame:** as rotas `/p/:path*` e `/portal` continuam funcionando do mesmo jeito.
- **GitHub:** repositório não muda.

### Prós e contras para este projeto específico

**Prós da VPS:**
- Custo fixo e previsível (sem cobrança por execução de função)
- Sem limite de 12 segundos por request (Vercel Hobby tem timeout de 10s nas funções)
- Sem limite de invocações de cron por mês
- Controle total sobre logs e arquivos

**Contras da VPS:**
- Você é responsável por atualizações de segurança do sistema operacional
- Se a VPS cair, você reinicia manualmente (ou configura monitoramento externo)
- Setup inicial leva algumas horas na primeira vez

---

## 2. O que contratar na Hostinger

### Plano recomendado: KVM 2

Este app tem tráfego leve (pesquisas CSAT de escolas, não e-commerce). O plano **KVM 2** da Hostinger cobre bem:

| Recurso | KVM 2 | Por que é suficiente |
|---|---|---|
| RAM | 8 GB | Next.js standalone usa ~200-400 MB em idle |
| vCPU | 2 cores | Build do app + servidor em produção |
| Disco | 100 GB NVMe | App + logs: menos de 2 GB |
| Banda | ilimitada | Volume de requisições baixo |

> Se quiser margem maior por segurança: KVM 4 (16 GB RAM) — não é necessário para este workload.

### Sistema operacional

Ao criar a VPS na Hostinger, selecione:
**Ubuntu 24.04 LTS** (Long Term Support = suporte garantido até 2029)

Não escolha CentOS, Debian ou outras opções — Ubuntu é o mais documentado e com mais exemplos online.

### Configurações ao criar a VPS na Hostinger

1. Selecione a região mais próxima: **São Paulo** (se disponível) ou Miami
2. **Autenticação:** escolha "SSH Key" em vez de senha. Mais seguro. (Instruções na seção 3.)
3. Anote o **IP público** da VPS — você vai precisar dele em vários passos.

---

## 3. Setup inicial da VPS

### O que é SSH?

SSH (Secure Shell) é como um controle remoto de computador via terminal. Você abre o Terminal (Mac) ou PowerShell (Windows), digita um comando, e passa a controlar o servidor da Hostinger como se estivesse sentado na frente dele.

### 3.1 — Conectar pela primeira vez

No seu computador (PowerShell ou Terminal):

```bash
ssh root@SEU_IP_AQUI
```

Substitua `SEU_IP_AQUI` pelo IP da VPS (ex: `ssh root@186.123.45.67`).

Na primeira conexão, vai aparecer uma pergunta sobre "fingerprint" — digite `yes` e pressione Enter. Isso é normal; só acontece uma vez.

---

### 3.2 — Criar um usuário não-root

É uma boa prática não usar o usuário `root` para tudo. Vamos criar um usuário `deploy`:

```bash
# Criar o usuário
adduser deploy

# Dar permissão de administrador (sudo) para ele
usermod -aG sudo deploy

# Mudar para o novo usuário
su - deploy
```

A partir daqui, todos os comandos serão rodados como usuário `deploy`.

---

### 3.3 — Atualizar o sistema

O sistema vem com pacotes desatualizados. Atualize antes de instalar qualquer coisa:

```bash
sudo apt update && sudo apt upgrade -y
```

Isso pode demorar alguns minutos. É como o "Windows Update" do Linux.

---

### 3.4 — Instalar Node.js 22

O Next.js 16 precisa do Node.js 18 ou superior. Vamos instalar o Node.js 22 (LTS mais recente):

```bash
# Baixar o instalador oficial do Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Instalar o Node.js
sudo apt install -y nodejs

# Verificar se instalou corretamente
node -v   # deve mostrar v22.x.x
npm -v    # deve mostrar 10.x.x
```

---

### 3.5 — Instalar o PM2

**O que é o PM2?**

Imagine que seu app Next.js é um funcionário. Se ele sai sem avisar (crash), o serviço para. O PM2 é como um supervisor: ele monitora o funcionário, e se ele sair, contrata um novo automaticamente. Também reinicia o app quando a VPS é reiniciada.

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalação
pm2 -v
```

---

### 3.6 — Instalar o Nginx

**O que é o Nginx?**

Quando alguém acessa `https://seu-dominio.com`, a requisição chega na porta 443 da VPS. Mas seu app Next.js roda na porta 3000. O Nginx é o recepcionista: recebe a visita na porta 443, pega o pedido, repassa para o Next.js na porta 3000, e devolve a resposta. Também cuida do HTTPS.

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar o Nginx e configurar para subir automaticamente
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar se está rodando
sudo systemctl status nginx
# Deve mostrar "active (running)" em verde
```

---

### 3.7 — Configurar o firewall

O firewall é como a portaria do prédio: só deixa entrar quem deve entrar.

```bash
# Liberar SSH (para você continuar conectando)
sudo ufw allow OpenSSH

# Liberar HTTP (porta 80)
sudo ufw allow 'Nginx HTTP'

# Liberar HTTPS (porta 443)
sudo ufw allow 'Nginx HTTPS'

# Ativar o firewall
sudo ufw enable

# Verificar regras ativas
sudo ufw status
```

Saída esperada:
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx HTTP                 ALLOW       Anywhere
Nginx HTTPS                ALLOW       Anywhere
```

---

## 4. Deploy do app

### 4.1 — Gerar chave SSH para acessar o GitHub

A VPS precisa de permissão para baixar o código do seu repositório privado:

```bash
# Gerar par de chaves SSH (pressione Enter 3x para usar padrões)
ssh-keygen -t ed25519 -C "deploy@vps-raiz"

# Exibir a chave pública
cat ~/.ssh/id_ed25519.pub
```

Copie toda a saída (começa com `ssh-ed25519`). Depois:

1. Acesse https://github.com/projetos-hub/pesquisa
2. Vá em **Settings → Deploy keys → Add deploy key**
3. Título: `VPS Hostinger`
4. Cole a chave copiada
5. Marque "Allow write access": NÃO (só leitura é suficiente)
6. Clique "Add key"

---

### 4.2 — Clonar o repositório

```bash
# Criar pasta para o app
sudo mkdir -p /var/www/pesquisa
sudo chown deploy:deploy /var/www/pesquisa

# Clonar o repositório (a pasta survey-platform é o root do app)
git clone git@github.com:projetos-hub/pesquisa.git /var/www/pesquisa-repo

# Criar link simbólico para a pasta do app
ln -s /var/www/pesquisa-repo/survey-platform /var/www/pesquisa/app
```

---

### 4.3 — Configurar as variáveis de ambiente

**NUNCA** coloque credenciais no código ou no repositório Git. As env vars ficam em um arquivo `.env.local` na VPS, que não vai para o Git.

```bash
# Ir para a pasta do app
cd /var/www/pesquisa/app

# Criar o arquivo de variáveis de ambiente
nano .env.local
```

O editor `nano` vai abrir. Cole o conteúdo abaixo, preenchendo com os valores reais:

```
NEXT_PUBLIC_SUPABASE_URL=https://qnpvlhfjknnvfiyxrhhl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SEU_VALOR_AQUI
SUPABASE_SERVICE_ROLE_KEY=SEU_VALOR_AQUI
LAYERS_API_TOKEN=SEU_VALOR_AQUI
NEXT_PUBLIC_LAYERS_APP_ID=SEU_VALOR_AQUI
SHEETS_WEBHOOK_URL=SEU_VALOR_AQUI
CRON_SECRET=SEU_VALOR_AQUI
```

Para salvar no `nano`: pressione `Ctrl+X`, depois `Y`, depois `Enter`.

**Onde achar os valores:** copie do `.env.local` da sua máquina local ou do painel de configurações do Vercel (Settings → Environment Variables).

Proteger o arquivo para que apenas o dono leia:
```bash
chmod 600 .env.local
```

---

### 4.4 — Instalar dependências e fazer o build

```bash
cd /var/www/pesquisa/app

# Instalar dependências (equivalente ao npm install, mas respeita o lockfile)
npm ci

# Fazer o build de produção
npm run build
```

O build pode demorar de 2 a 5 minutos. Se concluir sem erros, vai aparecer algo como:
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
```

Se der erro, leia a mensagem — normalmente é env var faltando ou versão do Node errada.

---

### 4.5 — Configurar o PM2

```bash
# Iniciar o app com PM2
pm2 start npm --name "survey-platform" -- start

# Salvar a configuração para que reinicie automaticamente com a VPS
pm2 save

# Configurar o PM2 para iniciar com o sistema operacional
pm2 startup
```

O último comando vai exibir uma linha de texto começando com `sudo`. Copie essa linha inteira e execute-a. É algo como:
```
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
```

Verificar se o app está rodando:
```bash
pm2 status
```

Deve mostrar `survey-platform | online`.

---

### 4.6 — Configurar o Nginx como proxy

Agora vamos conectar o Nginx (porta 80/443) ao app Next.js (porta 3000).

```bash
# Criar arquivo de configuração do site
sudo nano /etc/nginx/sites-available/pesquisa
```

Cole esta configuração (substitua `SEU_DOMINIO.com.br` pelo domínio real):

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br www.SEU_DOMINIO.com.br;

    # Logs
    access_log /var/log/nginx/pesquisa_access.log;
    error_log /var/log/nginx/pesquisa_error.log;

    # Aumentar limite de upload (para arquivos Excel)
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout maior para o cron de sync-sheets que pode demorar
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
```

Ativar o site e reiniciar o Nginx:

```bash
# Criar link simbólico para ativar o site
sudo ln -s /etc/nginx/sites-available/pesquisa /etc/nginx/sites-enabled/

# Remover o site padrão do Nginx
sudo rm /etc/nginx/sites-enabled/default

# Verificar se a configuração está correta
sudo nginx -t
# Deve mostrar: syntax is ok | test is successful

# Recarregar o Nginx
sudo systemctl reload nginx
```

---

## 5. Domínio e HTTPS

### 5.1 — Apontar o domínio para a VPS

No painel de DNS do seu domínio (Registro.br, Cloudflare, ou onde estiver registrado):

1. Crie um registro tipo **A**
2. Nome: `@` (raiz do domínio) ou `pesquisa` (subdomínio)
3. Valor: **IP da sua VPS**
4. TTL: 3600 (1 hora)

Se for usar subdomínio (ex: `pesquisa.raizeducacao.com.br`):
- Registro A: `pesquisa` → `SEU_IP_DA_VPS`

Aguarde entre 5 minutos e 24 horas para a propagação do DNS. Você pode testar em https://dnschecker.org digitando seu domínio.

---

### 5.2 — Instalar SSL com Certbot (HTTPS gratuito)

**O que é o Certbot?** É uma ferramenta gratuita que emite e renova automaticamente certificados SSL — o "cadeado" que aparece no navegador e que torna o site HTTPS em vez de HTTP.

```bash
# Instalar o Certbot
sudo apt install -y certbot python3-certbot-nginx

# Emitir o certificado (substitua pelo domínio real)
sudo certbot --nginx -d SEU_DOMINIO.com.br -d www.SEU_DOMINIO.com.br
```

O Certbot vai:
1. Perguntar seu e-mail (para avisos de renovação)
2. Pedir para aceitar os termos de serviço
3. Perguntar se quer redirecionar HTTP → HTTPS automaticamente: escolha **2 (Redirect)**

Após concluir, acesse `https://SEU_DOMINIO.com.br` no navegador. Deve funcionar com cadeado.

**Renovação automática:** o Certbot já configura isso sozinho. O certificado expira em 90 dias e é renovado automaticamente. Para verificar:

```bash
sudo certbot renew --dry-run
```

Se não der erro, a renovação automática está configurada.

---

## 6. Substituir os Crons do Vercel

### Como funcionava no Vercel

O `vercel.json` tinha esta configuração:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-sheets",
      "schedule": "0 11 * * *"
    }
  ]
}
```

Isso fazia o Vercel chamar `GET /api/cron/sync-sheets` todo dia às 11h UTC automaticamente.

Além disso, o endpoint `/api/cron/process-dispatches` (advance-survey-status) era chamado a cada hora.

Na VPS, isso não existe. Vamos usar o **crontab do Linux**, que é exatamente a mesma coisa: um agendador que executa comandos em horários definidos.

---

### 6.1 — Entender o formato cron

O formato é: `minuto hora dia-do-mês mês dia-da-semana comando`

- `0 11 * * *` = "No minuto 0 da hora 11, todo dia, todo mês, qualquer dia da semana" = diário às 11:00
- `0 * * * *` = "No minuto 0 de toda hora" = a cada hora

---

### 6.2 — Configurar o crontab

```bash
# Abrir o editor de cron do usuário deploy
crontab -e
```

Na primeira vez, vai perguntar qual editor usar. Escolha **1 (nano)**.

Adicione estas duas linhas ao final do arquivo:

```bash
# Cron 1: sync-sheets — todo dia às 11h00 (UTC)
# Ajuste o horário se precisar de horário de Brasília (BRT = UTC-3, então 11h UTC = 8h BRT)
0 11 * * * curl -s -X GET "https://SEU_DOMINIO.com.br/api/cron/sync-sheets" -H "Authorization: Bearer SEU_CRON_SECRET" >> /var/log/cron-sync-sheets.log 2>&1

# Cron 2: process-dispatches — todo dia às 14h00 UTC (horário de Brasília: 11h)
# Este era o "advance-survey-status". Ajuste conforme necessário.
0 14 * * * curl -s -X GET "https://SEU_DOMINIO.com.br/api/cron/process-dispatches" -H "Authorization: Bearer SEU_CRON_SECRET" >> /var/log/cron-process-dispatches.log 2>&1
```

**Atenção:**
- Substitua `SEU_DOMINIO.com.br` pelo domínio real
- Substitua `SEU_CRON_SECRET` pelo valor real da variável `CRON_SECRET`
- Os horários estão em UTC. Se quiser horário de Brasília (UTC-3), subtraia 3 horas do horário desejado. Ex: quer rodar às 8h Brasília → `0 11 * * *`

Salvar: `Ctrl+X`, `Y`, `Enter`.

---

### 6.3 — Verificar se o cron está registrado

```bash
crontab -l
```

Deve mostrar as duas linhas que você adicionou.

---

### 6.4 — Testar os endpoints manualmente antes de confiar no cron

```bash
# Testar sync-sheets
curl -v -X GET "https://SEU_DOMINIO.com.br/api/cron/sync-sheets" \
  -H "Authorization: Bearer SEU_CRON_SECRET"

# Testar process-dispatches
curl -v -X GET "https://SEU_DOMINIO.com.br/api/cron/process-dispatches" \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

Resposta esperada: status HTTP 200 com algum JSON de sucesso.

---

### 6.5 — Ver logs dos crons

```bash
# Ver log do sync-sheets
tail -f /var/log/cron-sync-sheets.log

# Ver log do process-dispatches
tail -f /var/log/cron-process-dispatches.log
```

---

## 7. Substituir o CI/CD do Vercel

### Como funcionava

Cada push na branch `main` fazia o Vercel:
1. Detectar o push
2. Rodar `npm run build`
3. Publicar automaticamente

### Como vai funcionar na VPS

Um GitHub Action vai:
1. Detectar o push em `main`
2. Conectar na VPS via SSH
3. Rodar os comandos de atualização e redeploy

---

### 7.1 — Adicionar a chave SSH como secret no GitHub

Na VPS, gere uma chave específica para o deploy:

```bash
# Gerar chave SSH para o GitHub Actions usar
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Exibir a chave privada (vai para o GitHub como Secret)
cat ~/.ssh/github_actions_deploy

# Exibir a chave pública (vai para o authorized_keys da VPS)
cat ~/.ssh/github_actions_deploy.pub
```

Adicionar a chave pública à lista de chaves autorizadas da VPS:
```bash
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Agora adicione a chave **privada** como secret no GitHub:
1. Acesse https://github.com/projetos-hub/pesquisa
2. Vá em **Settings → Secrets and variables → Actions**
3. Clique em **New repository secret**
4. Nome: `VPS_SSH_PRIVATE_KEY`
5. Valor: cole o conteúdo inteiro da chave privada (começa com `-----BEGIN OPENSSH PRIVATE KEY-----`)

Adicione também os outros secrets necessários:
- Nome: `VPS_HOST` → Valor: IP da sua VPS (ex: `186.123.45.67`)
- Nome: `VPS_USER` → Valor: `deploy`

---

### 7.2 — Criar o workflow do GitHub Actions

Na sua máquina local (não na VPS), crie o arquivo:

**Caminho:** `.github/workflows/deploy.yml` (na raiz do repositório `pesquisa`)

```yaml
name: Deploy para VPS

on:
  push:
    branches:
      - main
    paths:
      - 'survey-platform/**'

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout do código
        uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_PRIVATE_KEY }}
          script: |
            set -e

            echo "=== Atualizando código ==="
            cd /var/www/pesquisa-repo
            git fetch origin main
            git checkout main
            git pull origin main

            echo "=== Instalando dependências ==="
            cd survey-platform
            npm ci

            echo "=== Fazendo build ==="
            npm run build

            echo "=== Reiniciando o app ==="
            pm2 restart survey-platform

            echo "=== Deploy concluído ==="
            pm2 status
```

**Observação:** o arquivo `.env.local` fica na VPS e não é sobrescrito pelo deploy. As variáveis de ambiente ficam seguras.

---

### 7.3 — Commitar e testar o workflow

```bash
# Na sua máquina local
git add .github/workflows/deploy.yml
git commit -m "chore: add VPS deploy workflow"
git push origin main
```

Acompanhe a execução em: https://github.com/projetos-hub/pesquisa/actions

Se der erro, clique no job para ver os logs detalhados.

---

## 8. Monitoramento básico

### Ver status do app

```bash
# Status resumido de todos os processos
pm2 status

# Status detalhado com uso de CPU e RAM
pm2 monit
```

### Ver logs em tempo real

```bash
# Todos os logs (stdout + stderr)
pm2 logs

# Só erros
pm2 logs --err

# Últimas 100 linhas
pm2 logs --lines 100
```

### Reiniciar o app

```bash
# Reinício suave (zero downtime)
pm2 reload survey-platform

# Reinício forçado (para quando travar de vez)
pm2 restart survey-platform
```

### Ver logs do Nginx

```bash
# Acessos (todas as requisições)
sudo tail -f /var/log/nginx/pesquisa_access.log

# Erros do Nginx
sudo tail -f /var/log/nginx/pesquisa_error.log
```

### Verificar uso de disco

```bash
df -h
```

### Verificar uso de memória

```bash
free -h
```

### Configurar reinício automático do PM2 após reboot da VPS

Este comando já foi rodado na seção 4.5, mas vale confirmar que está ativo:

```bash
pm2 list
# Se survey-platform aparecer, está tudo certo
```

---

## 9. Checklist de migração

Execute cada item nesta ordem. Só avance para o próximo quando o atual estiver concluído.

### Fase 1 — Preparação (máquina local)

- [ ] Anotar todos os valores das env vars do Vercel (Settings → Environment Variables)
- [ ] Verificar que o `npm run build` passa localmente: `cd survey-platform && npm run build`
- [ ] Confirmar o domínio que será usado na VPS

### Fase 2 — Contratar e configurar VPS

- [ ] Contratar VPS KVM 2 na Hostinger com Ubuntu 24.04 LTS
- [ ] Anotar o IP público da VPS
- [ ] Conectar via SSH: `ssh root@SEU_IP`
- [ ] Criar usuário `deploy`: `adduser deploy && usermod -aG sudo deploy`
- [ ] Atualizar sistema: `sudo apt update && sudo apt upgrade -y`
- [ ] Instalar Node.js 22: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs`
- [ ] Verificar versão: `node -v` (deve ser v22.x)
- [ ] Instalar PM2: `sudo npm install -g pm2`
- [ ] Instalar Nginx: `sudo apt install -y nginx`
- [ ] Configurar firewall (seção 3.7)

### Fase 3 — Deploy do app

- [ ] Gerar chave SSH na VPS e adicionar ao GitHub como Deploy Key (seção 4.1)
- [ ] Clonar repositório na VPS (seção 4.2)
- [ ] Criar `.env.local` na VPS com todas as variáveis (seção 4.3)
- [ ] Rodar `npm ci` na pasta `survey-platform`
- [ ] Rodar `npm run build` — sem erros
- [ ] Iniciar com PM2: `pm2 start npm --name "survey-platform" -- start`
- [ ] Verificar que app responde: `curl http://localhost:3000` (deve retornar HTML)
- [ ] Configurar PM2 startup (seção 4.5)

### Fase 4 — Nginx e domínio

- [ ] Criar configuração do Nginx (seção 4.6)
- [ ] Testar configuração: `sudo nginx -t`
- [ ] Recarregar Nginx: `sudo systemctl reload nginx`
- [ ] Apontar DNS do domínio para o IP da VPS (seção 5.1)
- [ ] Aguardar propagação DNS (5 min a 24h)
- [ ] Verificar que `http://SEU_DOMINIO.com.br` carrega o app
- [ ] Instalar certificado SSL: `sudo certbot --nginx -d SEU_DOMINIO.com.br`
- [ ] Verificar que `https://SEU_DOMINIO.com.br` carrega com cadeado

### Fase 5 — Crons

- [ ] Testar endpoint sync-sheets manualmente com `curl` (seção 6.4)
- [ ] Testar endpoint process-dispatches manualmente com `curl`
- [ ] Configurar crontab (seção 6.2)
- [ ] Verificar crontab: `crontab -l`
- [ ] Aguardar próxima execução agendada e verificar o log

### Fase 6 — CI/CD

- [ ] Gerar chave SSH de deploy na VPS (seção 7.1)
- [ ] Adicionar chave pública ao `authorized_keys` da VPS
- [ ] Adicionar `VPS_SSH_PRIVATE_KEY`, `VPS_HOST`, `VPS_USER` como secrets no GitHub
- [ ] Criar arquivo `.github/workflows/deploy.yml` (seção 7.2)
- [ ] Fazer push e verificar execução em GitHub Actions
- [ ] Confirmar que o app foi atualizado após o push

### Fase 7 — Cutover (troca do endereço)

- [ ] Com tudo funcionando na VPS, testar o app completamente pela URL nova
- [ ] Atualizar configurações no Layers Education para apontar para o novo domínio (se necessário)
- [ ] Atualizar CORS/domínio no Supabase se houver restrição de domínio
- [ ] Remover integração Vercel do GitHub (opcional — pode manter como fallback por 30 dias)
- [ ] Cancelar plano Vercel se não for mais usar

---

## 10. Armadilhas comuns

### 1. Variáveis de ambiente faltando no build

**Sintoma:** build falha com erro sobre variável indefinida, ou app sobe mas mostra tela em branco.

**Causa:** o `.env.local` não existe ou tem variáveis erradas.

**Solução:**
```bash
cd /var/www/pesquisa/app
cat .env.local  # verificar se todas estão lá
```

Compare com a lista da seção 4.3.

---

### 2. Porta 3000 bloqueada pelo firewall

**Sintoma:** `pm2 status` mostra `online`, mas acessar pelo browser não funciona.

**Causa:** o firewall bloqueou a porta diretamente.

**Solução:** não exponha a porta 3000 diretamente. O Nginx faz o redirecionamento. Verifique se o Nginx está rodando:
```bash
sudo systemctl status nginx
```

---

### 3. App trava após alguns dias (memory leak)

**Sintoma:** app começa a responder lento ou para de responder.

**Causa:** Next.js em modo `npm start` pode acumular memória ao longo do tempo.

**Solução:** configure o PM2 para reiniciar quando a memória ultrapassar 500 MB:
```bash
pm2 delete survey-platform
pm2 start npm --name "survey-platform" -- start --max-memory-restart 500M
pm2 save
```

---

### 4. Deploy automático quebra o app

**Sintoma:** GitHub Actions roda com sucesso, mas o app para de funcionar.

**Causa:** build com erro que o CI não detectou, ou PM2 não reiniciou corretamente.

**Solução:** adicionar verificação pós-deploy no workflow:
```bash
# Adicionar ao final do script do workflow
sleep 5
curl -f http://localhost:3000 || (pm2 logs --lines 50 && exit 1)
```

---

### 5. Cron não executa

**Sintoma:** log do cron está vazio ou não foi criado.

**Causa:** crontab vazio, horário UTC incorreto, ou URL errada.

**Diagnóstico:**
```bash
# Ver se o cron está configurado
crontab -l

# Ver logs do sistema de cron
sudo journalctl -u cron --since "1 hour ago"

# Testar o comando manualmente (copie a linha do crontab sem o horário)
curl -s -X GET "https://SEU_DOMINIO.com.br/api/cron/sync-sheets" -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

### 6. Certificado SSL não renova

**Sintoma:** após 90 dias, o site mostra aviso de certificado expirado.

**Causa:** o timer do Certbot foi desativado ou o Nginx não está acessível na porta 80.

**Solução:**
```bash
# Verificar se a renovação automática está ativa
sudo systemctl status certbot.timer

# Forçar renovação manual
sudo certbot renew
```

---

### 7. Comportamento diferente entre Vercel e Node.js standalone

| Vercel | VPS (Node standalone) |
|---|---|
| Functions têm timeout de 10s (Hobby) | Sem limite de timeout por padrão |
| Cada deploy gera uma nova instância | Uma instância contínua com estado |
| `console.log` vai para o dashboard | `console.log` vai para `pm2 logs` |
| Headers de cache gerenciados automaticamente | Nginx gerencia headers de cache |
| Variáveis de ambiente injetadas por projeto | `.env.local` no filesystem da VPS |

**Atenção especial:** o Next.js no modo `npm start` usa o servidor **standalone**. Isso significa que o app mantém estado em memória entre requests (ao contrário do Vercel onde cada invocação é stateless). Se o código depende de variáveis globais sendo zeradas entre requests, pode se comportar diferente.

---

### 8. Problema com iFrame no Layers

**Sintoma:** app para de aparecer dentro do Layers após migração.

**Causa:** `Content-Security-Policy` ou `X-Frame-Options` configurado incorretamente no Nginx sobrescrevendo os headers do Next.js.

**Solução:** o `next.config.ts` já configura os headers corretos para as rotas `/p/*`, `/portal` e `/admin`. Não adicione headers CSP ou X-Frame-Options no Nginx — deixe o Next.js controlar isso.

---

### 9. Disk space esgotado por logs

**Sintoma:** após meses, a VPS para de funcionar por falta de disco.

**Causa:** logs do PM2 e Nginx crescem indefinidamente.

**Solução:** configurar rotação de logs:
```bash
# Configurar rotação automática de logs do PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10

# Nginx já tem logrotate configurado por padrão
```

---

*Plano gerado em junho/2026 com base no stack atual: Next.js 16.1.6 + React 19 + Tailwind CSS 4 + Supabase.*
