import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# ── FIX D: Pg 11 — "Como funcionam" + 1 screenshot = ~50% vazio
# Inserir tabela "Tipos de disparo disponíveis" antes do page-break para Régua
TIPOS_DISPARO = """

<h3>Tipos de disparo disponíveis</h3>
<table>
  <thead><tr><th>Tipo</th><th>Quando usar</th><th>Execução</th></tr></thead>
  <tbody>
    <tr>
      <td><strong>Único</strong></td>
      <td>Comunicado pontual (ex: lembrete de evento)</td>
      <td>Uma vez, agendado ou imediato</td>
    </tr>
    <tr>
      <td><strong>Régua automática</strong></td>
      <td>Engajamento progressivo ao longo da pesquisa</td>
      <td>Automático por offset em dias</td>
    </tr>
    <tr>
      <td><strong>Disparo rápido</strong></td>
      <td>Teste ou comunicado urgente sem configuração</td>
      <td>Imediato via painel</td>
    </tr>
  </tbody>
</table>
<div class="note">
  <strong>Canal recomendado:</strong> use <strong>Push + E-mail</strong> combinados para maximizar
  a taxa de abertura. Push tem abertura imediata; e-mail garante entrega mesmo quando o app
  Layers não está instalado.
</div>

"""

anchor_d = '\n\n<div class="page-break"></div>\n<h3>Régua de disparos (sequência automática)</h3>'
if anchor_d in c:
    c = c.replace(anchor_d, TIPOS_DISPARO + '<div class="page-break"></div>\n<h3>Régua de disparos (sequência automática)</h3>', 1)
    changes.append('✓ Pg 11: adicionado tabela "Tipos de disparo disponíveis"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora Régua de disparos')

# ── FIX E: Pg 17 — URL params table + exemplo = ~40% vazio
# Inserir tabela de comportamentos do sistema antes de </section>
COMPORTAMENTOS = """

<h3>Comportamentos do sistema por situação</h3>
<table>
  <thead><tr><th>Situação</th><th>O que o respondente vê</th></tr></thead>
  <tbody>
    <tr>
      <td>Pesquisa já respondida anteriormente</td>
      <td>Mensagem: "Você já respondeu esta pesquisa"</td>
    </tr>
    <tr>
      <td>Campo obrigatório em branco</td>
      <td>Botão "Avançar" bloqueado; campo destacado em vermelho</td>
    </tr>
    <tr>
      <td>Pesquisa com uma única pergunta</td>
      <td>Resposta enviada diretamente para tela de agradecimento</td>
    </tr>
    <tr>
      <td>userId ou communityId ausente</td>
      <td>Tela de erro genérica — não carrega a pesquisa</td>
    </tr>
    <tr>
      <td>Pesquisa com identidade visual configurada</td>
      <td>Cores e logo da escola aplicados em toda a navegação</td>
    </tr>
  </tbody>
</table>
"""

anchor_e = 'communityId=escola-beta</code>\n</div>\n</section>'
if anchor_e in c:
    c = c.replace(anchor_e, 'communityId=escola-beta</code>\n</div>' + COMPORTAMENTOS + '\n</section>', 1)
    changes.append('✓ Pg 17: adicionado tabela "Comportamentos do sistema por situação"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora communityId=escola-beta')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes aplicados:')
for ch in changes:
    print(' ', ch)
