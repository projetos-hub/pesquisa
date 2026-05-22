import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

original_len = len(c)
changes = []

# ── FIX 1: Remove page-break antes de "Como configurar"
# Pg 10 era 80% vazia — merge com pg 09 (identidade visual 85%)
old = '<div class="page-break"></div>\n<h3>Como configurar</h3>'
new = '<h3>Como configurar</h3>'
if old in c:
    c = c.replace(old, new, 1)
    changes.append('✓ Removido page-break antes de "Como configurar"')
else:
    changes.append('✗ NÃO ENCONTRADO: page-break antes de "Como configurar"')

# ── FIX 2: Remove page-break antes de "Amostra Segmentada"
# Pg 13 era 75% vazia (só 1 screenshot) — merge com pg 14
old = '<div class="page-break"></div>\n<h3>Amostra Segmentada</h3>'
new = '<h3>Amostra Segmentada</h3>'
if old in c:
    c = c.replace(old, new, 1)
    changes.append('✓ Removido page-break antes de "Amostra Segmentada"')
else:
    changes.append('✗ NÃO ENCONTRADO: page-break antes de "Amostra Segmentada"')

# ── FIX 3: Remove page-break antes de "Placeholders disponíveis"
# Pg 15 era 70% vazia (tabela de 4 linhas) — merge com pg 14
old = '<div class="page-break"></div>\n<h3>Placeholders dispon'
if old in c:
    idx = c.find(old)
    c = c[:idx] + c[idx + len('<div class="page-break"></div>\n'):]
    changes.append('✓ Removido page-break antes de "Placeholders disponíveis"')
else:
    changes.append('✗ NÃO ENCONTRADO: page-break antes de "Placeholders disponíveis"')

# ── FIX 4: Remove page-break antes de "Estados da pesquisa para o respondente"
# Pg 18 era 70% vazia (tabela de 5 linhas) — merge com pg 17
old = '<div class="page-break"></div>\n<h3>Estados da pesquisa para o respondente</h3>'
new = '<h3>Estados da pesquisa para o respondente</h3>'
if old in c:
    c = c.replace(old, new, 1)
    changes.append('✓ Removido page-break antes de "Estados da pesquisa"')
else:
    changes.append('✗ NÃO ENCONTRADO: page-break antes de "Estados da pesquisa"')

# ── FIX 5: Adiciona "Mapa deste guia" na Seção 1 (pg 02 era 35% vazia)
MAPA = """
<h3>Mapa deste guia</h3>
<table>
  <thead>
    <tr><th>Seção</th><th>Módulo</th><th>O que você aprende</th></tr>
  </thead>
  <tbody>
    <tr><td>2</td><td>Primeiros Passos</td><td>Login e navegação inicial no painel</td></tr>
    <tr><td>3</td><td>Gerenciamento de Pesquisas</td><td>Criar e configurar pesquisas, perguntas e status</td></tr>
    <tr><td>4</td><td>Comunidades e Identidade Visual</td><td>Vincular escolas e personalizar tema visual</td></tr>
    <tr><td>5</td><td>Disparos de Notificação</td><td>Push/e-mail, régua automática e amostra segmentada</td></tr>
    <tr><td>6</td><td>Acompanhar Respostas</td><td>Visualizar, filtrar e exportar respostas para XLSX</td></tr>
    <tr><td>7</td><td>Fluxo do Respondente</td><td>Experiência do usuário final ao responder a pesquisa</td></tr>
    <tr><td>8</td><td>Glossário</td><td>Termos e definições da plataforma</td></tr>
  </tbody>
</table>
"""

anchor = '</section>\n\n<!-- ═══════════════════ 2. PRIMEIROS PASSOS'
if anchor in c:
    c = c.replace(anchor, MAPA + '</section>\n\n<!-- ═══════════════════ 2. PRIMEIROS PASSOS', 1)
    changes.append('✓ Adicionado "Mapa deste guia" na Seção 1')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora da Seção 1')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes aplicados:')
for ch in changes:
    print(' ', ch)
print(f'\nTamanho: {original_len:,} → {len(c):,} bytes')
