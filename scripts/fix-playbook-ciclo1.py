import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# ── FIX F: Pg 04 — "Visão geral do painel" ~70% vazio
# Adicionar nota de uso rápido antes do </section> (após screenshot)
NOTA_PAINEL = """

<div class="note" style="background:#E8F4FF; border-left-color:#0088FF;">
  <strong style="color:#0066CC;">Dica de navegação:</strong> a listagem de pesquisas é o ponto
  de partida do dia a dia. Use os filtros de status (<strong>Ativa</strong>, <strong>Rascunho</strong>,
  <strong>Encerrada</strong>) para encontrar rapidamente a pesquisa desejada. O contador de respostas
  é atualizado em tempo real.
</div>"""

anchor_f = '</section>\n\n<!-- ═══════════════════ 3. GERENCIAMENTO'
if anchor_f in c:
    c = c.replace(anchor_f, NOTA_PAINEL + '\n</section>\n\n<!-- ═══════════════════ 3. GERENCIAMENTO', 1)
    changes.append('✓ Pg 04: adicionada nota de navegação do painel')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora Seção 3 GERENCIAMENTO')

# ── FIX G: Pg 07 — "Adicionar perguntas" ~65% vazio
# Adicionar nota sobre configuração de perguntas antes do </section> (após screenshot)
NOTA_PERGUNTAS = """

<div class="note">
  <strong>Campos obrigatórios:</strong> qualquer tipo de pergunta pode ser marcado como
  obrigatório — o respondente não consegue avançar sem responder. Use com moderação para
  não gerar abandono.
</div>

<h3>Ordem e organização das perguntas</h3>
<table>
  <thead><tr><th>Ação</th><th>Como fazer</th></tr></thead>
  <tbody>
    <tr><td>Reordenar</td><td>Arrastar pelo ícone de alça (⠿) à esquerda da pergunta</td></tr>
    <tr><td>Duplicar</td><td>Menu de opções (⋯) → Duplicar</td></tr>
    <tr><td>Excluir</td><td>Menu de opções (⋯) → Excluir (sem confirmação)</td></tr>
    <tr><td>Pré-visualizar</td><td>Botão <strong>Visualizar</strong> no topo do painel</td></tr>
  </tbody>
</table>"""

anchor_g = '</section>\n\n<!-- ═══════════════════ 4. COMUNIDADES'
if anchor_g in c:
    c = c.replace(anchor_g, NOTA_PERGUNTAS + '\n</section>\n\n<!-- ═══════════════════ 4. COMUNIDADES', 1)
    changes.append('✓ Pg 07: adicionada nota + tabela de organização de perguntas')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora Seção 4 COMUNIDADES')

# ── FIX H: Corrigir typo <\strong> → </strong> (line 391)
typo = '<strong>Nova pergunta<\\strong>'
if typo in c:
    c = c.replace(typo, '<strong>Nova pergunta</strong>', 1)
    changes.append('✓ Fix typo: <\\strong> → </strong> em "Adicionar perguntas"')
else:
    # Already fixed or different format
    changes.append('○ Typo <\\strong> não encontrado (já corrigido ou formato diferente)')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes do Ciclo 1 aplicados:')
for ch in changes:
    print(' ', ch)
