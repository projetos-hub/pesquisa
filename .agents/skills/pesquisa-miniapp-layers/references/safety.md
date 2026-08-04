# Seguranca operacional

| Classe | Exemplos | Gate |
|---|---|---|
| leitura | listar, auditar, contar, preview | sem confirmacao |
| escrita reversivel | texto, datas, tema, rascunho | plano + preflight |
| destrutiva | excluir, substituir amostra, revogar | backup + confirmacao especifica |
| externa | publicar, disparar, retry | preflight final + confirmacao do payload |
| schema/deploy | migration, RLS, producao | testes + auditoria + deploy gate |

## Segredos e PII
Mascarar e-mails, nomes, IDs e chaves. Nao salvar secrets em plano. Nunca imprimir valores do `.env.local`.

## Encoding
Bloquear U+FFFD, byte NUL, UTF-8 interpretado como Windows-1252, texto fora de NFC e pontos de interrogacao suspeitos ou repetidos. Abrir CSV como UTF-8 estrito e validar strings do XLSX.

## Recuperacao
Toda operacao em lote precisa de idempotencia, checkpoint, contadores e verificacao. Em falha parcial, parar, preservar checkpoint e nao repetir sucessos.

## Git
Antes de commit, configurar `user.email=projetos@raizeducacao.com.br` e `user.name=Projetos Raiz`. Nao commitar secrets, PII, sessoes ou tokens.
