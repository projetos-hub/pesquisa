import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# ── FIX I: Pg 03 — Login page ~35% vazio
# Inserir "Solução de problemas de acesso" antes do page-break para Visão geral
SOLUCAO_ACESSO = """

<h3>Solução de problemas de acesso</h3>
<table>
  <thead><tr><th>Problema</th><th>Causa provável</th><th>Solução</th></tr></thead>
  <tbody>
    <tr>
      <td>Senha incorreta</td>
      <td>Senha expirada ou digitada errada</td>
      <td>Usar "Esqueci minha senha" na tela de login</td>
    </tr>
    <tr>
      <td>Não recebo e-mail de reset</td>
      <td>Endereço não cadastrado</td>
      <td>Verificar o e-mail correto com o responsável técnico</td>
    </tr>
    <tr>
      <td>Acesso negado após login</td>
      <td>Conta sem permissão admin</td>
      <td>Solicitar ajuste de permissão ao responsável</td>
    </tr>
  </tbody>
</table>"""

anchor_i = '<figcaption>Tela de login com credenciais preenchidas</figcaption></figure>\n\n<div class="page-break"></div>\n<h3>Visão geral do painel</h3>'
if anchor_i in c:
    c = c.replace(
        anchor_i,
        '<figcaption>Tela de login com credenciais preenchidas</figcaption></figure>' + SOLUCAO_ACESSO + '\n\n<div class="page-break"></div>\n<h3>Visão geral do painel</h3>',
        1
    )
    changes.append('✓ Pg 03: adicionada tabela "Solução de problemas de acesso"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora Pg 03 login')

# ── FIX J: Pg 04 — Visão geral do painel ~40% vazio
# Inserir tabela "Primeiros passos recomendados" antes de </section>
PRIMEIROS_PASSOS = """

<h3>Primeiros passos recomendados</h3>
<table>
  <thead><tr><th>Ação</th><th>Onde encontrar</th></tr></thead>
  <tbody>
    <tr>
      <td>Verificar pesquisas ativas</td>
      <td>Menu <strong>Pesquisas</strong> → filtro Status: <strong>Ativa</strong></td>
    </tr>
    <tr>
      <td>Conferir comunidades cadastradas</td>
      <td>Menu <strong>Comunidades</strong> → lista de escolas vinculadas</td>
    </tr>
    <tr>
      <td>Revisar disparos agendados</td>
      <td>Menu <strong>Disparos</strong> → coluna Agendado para</td>
    </tr>
    <tr>
      <td>Exportar dados de uma pesquisa</td>
      <td>Menu <strong>Exportar</strong> → selecionar pesquisa → Baixar XLSX</td>
    </tr>
  </tbody>
</table>"""

anchor_j = 'é atualizado em tempo real.\n</div>\n</section>\n\n<!-- ═══════════════════ 3. GERENCIAMENTO'
if anchor_j in c:
    c = c.replace(
        anchor_j,
        'é atualizado em tempo real.\n</div>' + PRIMEIROS_PASSOS + '\n</section>\n\n<!-- ═══════════════════ 3. GERENCIAMENTO',
        1
    )
    changes.append('✓ Pg 04: adicionada tabela "Primeiros passos recomendados"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora Pg 04 dica navegação')

# ── FIX K: Pg 16 — Fluxo do Respondente ~35% vazio
# Inserir nota de personalização entre Percurso </ol> e Estados h3
NOTA_PERSONALIZACAO = """

<div class="note" style="background:#E8F4FF; border-left-color:#0088FF;">
  <strong style="color:#0066CC;">Mensagens configuráveis:</strong> as telas de boas-vindas e
  agradecimento aceitam texto livre com placeholders (<code>{{nome}}</code>,
  <code>{{nomeAluno}}</code>, <code>{{nomeEscola}}</code>, <code>{{serie}}</code>).
  Configure em cada pesquisa na aba <strong>Boas-vindas</strong> e
  <strong>Agradecimento</strong>.
</div>

<h3>Campos de personalização disponíveis</h3>
<table>
  <thead><tr><th>Placeholder</th><th>Substituído por</th><th>Fallback</th></tr></thead>
  <tbody>
    <tr><td><code>{{nome}}</code></td><td>Primeiro nome do responsável</td><td>"você"</td></tr>
    <tr><td><code>{{nomeAluno}}</code></td><td>Nome completo do aluno</td><td>"seu filho(a)"</td></tr>
    <tr><td><code>{{nomeEscola}}</code></td><td>Nome da escola</td><td>"a escola"</td></tr>
    <tr><td><code>{{serie}}</code></td><td>Série/turma ativa do aluno</td><td>"a turma"</td></tr>
  </tbody>
</table>"""

anchor_k = '<li><strong>Agradecimento</strong> — confirmação de envio com mensagem personalizada</li>\n</ol>\n\n<h3>Estados da pesquisa'
if anchor_k in c:
    c = c.replace(
        anchor_k,
        '<li><strong>Agradecimento</strong> — confirmação de envio com mensagem personalizada</li>\n</ol>' + NOTA_PERSONALIZACAO + '\n\n<h3>Estados da pesquisa',
        1
    )
    changes.append('✓ Pg 16: adicionada nota + tabela "Campos de personalização disponíveis"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora Pg 16 Percurso Agradecimento')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes do Ciclo 2 aplicados:')
for ch in changes:
    print(' ', ch)
