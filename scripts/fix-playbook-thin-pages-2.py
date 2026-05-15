import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# ── FIX A2: Pg 10 ainda ~45% vazio — adicionar "Onde aparece o tema visual"
# Inserir após o note de WCAG que já foi inserido
TABELA_ONDE = """
</div>

<h3>Onde o tema visual aparece para o respondente</h3>
<table>
  <thead><tr><th>Elemento da tela</th><th>Usa cor primária</th><th>Usa logo</th></tr></thead>
  <tbody>
    <tr><td>Botão "Responder" / "Avançar"</td><td>✓</td><td>—</td></tr>
    <tr><td>Barra de progresso das perguntas</td><td>✓</td><td>—</td></tr>
    <tr><td>Cabeçalho da pesquisa</td><td>✓</td><td>✓</td></tr>
    <tr><td>Tela de boas-vindas</td><td>✓</td><td>✓</td></tr>
    <tr><td>Tela de agradecimento</td><td>✓</td><td>✓</td></tr>
    <tr><td>Tela de erro / pesquisa encerrada</td><td>—</td><td>✓</td></tr>
  </tbody>
</table>"""

# Anchor: the Dica note added previously, looking for its closing </div>
anchor_a = 'garantem boa leitura no portal do respondente (padrão WCAG AA).\n</div>'
if anchor_a in c:
    c = c.replace(anchor_a, 'garantem boa leitura no portal do respondente (padrão WCAG AA).' + TABELA_ONDE, 1)
    changes.append('✓ Pg 10: adicionado tabela "Onde o tema visual aparece"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora dica WCAG')

# ── FIX B2: Pg 14 ainda ~55% vazio — adicionar tabela "Onde usar placeholders"
ONDE_USAR = """
</div>

<h3>Onde os placeholders podem ser usados</h3>
<table>
  <thead><tr><th>Local</th><th>Disponível</th></tr></thead>
  <tbody>
    <tr><td>Título da notificação push</td><td>✓</td></tr>
    <tr><td>Corpo da notificação push</td><td>✓</td></tr>
    <tr><td>Assunto do e-mail</td><td>✓</td></tr>
    <tr><td>Corpo do e-mail</td><td>✓</td></tr>
    <tr><td>Mensagem de boas-vindas da pesquisa</td><td>✓</td></tr>
    <tr><td>Mensagem de agradecimento</td><td>✓</td></tr>
    <tr><td>Título da pesquisa</td><td>—</td></tr>
    <tr><td>Texto das perguntas</td><td>—</td></tr>
  </tbody>
</table>"""

# Anchor: closing </div> of the agradecimento note (last thing added in fix B)
anchor_b = 'na <code>{{nomeEscola}}</code>.\n</div>'
if anchor_b in c:
    c = c.replace(anchor_b, 'na <code>{{nomeEscola}}</code>.' + ONDE_USAR, 1)
    changes.append('✓ Pg 14: adicionado tabela "Onde usar placeholders"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora agradecimento note')

# ── FIX C2: Pg 17 ainda ~65% vazio — adicionar tabela de parâmetros de acesso direto
PARAMS_LINK = """
</div>

<h3>Acesso por link direto — parâmetros de URL</h3>
<p>O gestor pode compartilhar um link com parâmetros para testes ou acesso sem o app Layers:</p>
<table>
  <thead><tr><th>Parâmetro</th><th>Obrigatório</th><th>Descrição</th></tr></thead>
  <tbody>
    <tr><td><code>userId</code></td><td>Sim</td><td>ID do usuário na plataforma Layers</td></tr>
    <tr><td><code>communityId</code></td><td>Sim</td><td>ID da comunidade (escola) na Layers</td></tr>
    <tr><td><code>name</code></td><td>Não</td><td>Nome de exibição (sobrescreve busca automática)</td></tr>
  </tbody>
</table>
<div class="note">
  <strong>Exemplo:</strong> <code>https://pesquisa-nu-sand.vercel.app/amostral-1-2026?userId=abc123&amp;communityId=escola-beta</code>
</div>"""

anchor_c = 'communidade da escola está instalada na\n  pesquisa?\n</div>'
if anchor_c not in c:
    # Try alternate formatting
    anchor_c = 'comunidade da escola está instalada na\n  pesquisa?\n</div>'
if anchor_c not in c:
    anchor_c = 'comunidade da escola está instalada na pesquisa?\n</div>'
if anchor_c not in c:
    # Search more broadly
    idx = c.find('comunidade da escola está instalada na')
    if idx > 0:
        end = c.find('</div>', idx)
        if end > 0:
            actual_anchor = c[idx:end+6]
            c = c.replace(actual_anchor, actual_anchor.rstrip('</div>').rstrip() + PARAMS_LINK, 1)
            changes.append('✓ Pg 17: adicionado tabela de parâmetros de URL')
        else:
            changes.append('✗ NÃO ENCONTRADO: closing div pg 17')
    else:
        changes.append('✗ NÃO ENCONTRADO: âncora pg 17 C2')
else:
    c = c.replace(anchor_c, anchor_c.replace('</div>', PARAMS_LINK), 1)
    changes.append('✓ Pg 17: adicionado tabela de parâmetros de URL')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes aplicados:')
for ch in changes:
    print(' ', ch)
