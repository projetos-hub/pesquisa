import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# ── FIX I-REV: Pg 03 — substituir tabela "Solução" (empurrava para nova página)
# por note box compacta que flui naturalmente na mesma página
OLD_SOLUCAO = """\n\n<h3>Solução de problemas de acesso</h3>\n<table>\n  <thead><tr><th>Problema</th><th>Causa provável</th><th>Solução</th></tr></thead>\n  <tbody>\n    <tr>\n      <td>Senha incorreta</td>\n      <td>Senha expirada ou digitada errada</td>\n      <td>Usar "Esqueci minha senha" na tela de login</td>\n    </tr>\n    <tr>\n      <td>Não recebo e-mail de reset</td>\n      <td>Endereço não cadastrado</td>\n      <td>Verificar o e-mail correto com o responsável técnico</td>\n    </tr>\n    <tr>\n      <td>Acesso negado após login</td>\n      <td>Conta sem permissão admin</td>\n      <td>Solicitar ajuste de permissão ao responsável</td>\n    </tr>\n  </tbody>\n</table>"""

NEW_SOLUCAO = """

<div class="note">
  <strong>Problemas de acesso?</strong> Se a senha não funcionar, use o link
  <strong>"Esqueci minha senha"</strong> na tela de login. Caso não receba o e-mail de reset,
  confirme o endereço correto com o responsável técnico. Para erros de "Acesso negado" após
  login, solicite a um administrador a revisão da sua permissão de perfil.
</div>"""

if OLD_SOLUCAO in c:
    c = c.replace(OLD_SOLUCAO, NEW_SOLUCAO, 1)
    changes.append('✓ Pg 03: tabela "Solução" substituída por note box (evita push para nova pg)')
else:
    changes.append('✗ NÃO ENCONTRADO: tabela "Solução de problemas de acesso"')

# ── FIX K-REV: Pg 16 — remover tabela "Campos de personalização disponíveis"
# (empurrava "Comportamentos" para pg 19 criando página extra)
# Manter apenas a note box "Mensagens configuráveis" (já injetada e funcionando)
OLD_CAMPOS_TABLE = """\n\n<h3>Campos de personalização disponíveis</h3>\n<table>\n  <thead><tr><th>Placeholder</th><th>Substituído por</th><th>Fallback</th></tr></thead>\n  <tbody>\n    <tr><td><code>{{nome}}</code></td><td>Primeiro nome do responsável</td><td>"você"</td></tr>\n    <tr><td><code>{{nomeAluno}}</code></td><td>Nome completo do aluno</td><td>"seu filho(a)"</td></tr>\n    <tr><td><code>{{nomeEscola}}</code></td><td>Nome da escola</td><td>"a escola"</td></tr>\n    <tr><td><code>{{serie}}</code></td><td>Série/turma ativa do aluno</td><td>"a turma"</td></tr>\n  </tbody>\n</table>"""

if OLD_CAMPOS_TABLE in c:
    c = c.replace(OLD_CAMPOS_TABLE, '', 1)
    changes.append('✓ Pg 16: tabela "Campos de personalização" removida (note box mantida; evita pg extra)')
else:
    changes.append('✗ NÃO ENCONTRADO: tabela "Campos de personalização disponíveis"')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes do Ciclo 2b aplicados:')
for ch in changes:
    print(' ', ch)
