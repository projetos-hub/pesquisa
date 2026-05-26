import sys
sys.stdout.reconfigure(encoding='utf-8')

html_path = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.html'

with open(html_path, 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# ── FIX A: Pg 10 — "Como configurar" só com 4 passos (~20%)
# Adiciona tabela "O que pode ser personalizado" após o último <li> da lista
NOTA_COMO_CONFIGURAR = """</li>
</ol>

<h3>O que pode ser personalizado</h3>
<table>
  <thead>
    <tr><th>Elemento</th><th>Nível global</th><th>Nível por pesquisa</th></tr>
  </thead>
  <tbody>
    <tr><td>Logo da escola</td><td>✓</td><td>✓</td></tr>
    <tr><td>Cor primária (botões, destaque)</td><td>✓</td><td>✓</td></tr>
    <tr><td>Cor secundária (fundo, bordas)</td><td>✓</td><td>✓</td></tr>
    <tr><td>Tema padrão para escolas novas</td><td>✓</td><td>—</td></tr>
    <tr><td>Sobrescrever tema global</td><td>—</td><td>✓</td></tr>
  </tbody>
</table>
<div class="note">
  <strong>Dica:</strong> use PNG com fundo transparente para o logo. Cores com contraste
  mínimo 4.5:1 garantem boa leitura no portal do respondente (padrão WCAG AA).
</div>"""

anchor_a = 'Salve — o tema é aplicado imediatamente para os respondentes dessa escola</li>\n<'
if anchor_a in c:
    c = c.replace(
        anchor_a,
        'Salve — o tema é aplicado imediatamente para os respondentes dessa escola' + NOTA_COMO_CONFIGURAR + '\n<',
        1
    )
    changes.append('✓ Pg 10: adicionado tabela + dica após "Como configurar"')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora pg 10')

# ── FIX B: Pg 14 — Placeholders tabela sozinha (~25%)
# Adiciona exemplo de uso real após o </table> dos placeholders
EXEMPLO_PLACEHOLDER = """</table>

<h3>Exemplo de mensagem personalizada</h3>
<div class="note">
  <strong>Push/e-mail de convite:</strong><br>
  <em>Título:</em> Olá, <code>{{nome}}</code>! Sua opinião sobre a <code>{{nomeEscola}}</code> é muito importante.<br>
  <em>Corpo:</em> Sabemos que acompanhar a trajetória de <code>{{nomeAluno}}</code> na <code>{{serie}}</code>
  é uma prioridade para você. Leva menos de 2 minutos — clique para responder.
</div>
<div class="note">
  <strong>Mensagem de agradecimento:</strong><br>
  Obrigado, <code>{{nome}}</code>! Sua resposta foi registrada e nos ajuda a melhorar
  a experiência de <code>{{nomeAluno}}</code> na <code>{{nomeEscola}}</code>.
</div>"""

# Find end of placeholders table
anchor_b = 'Fallback</th></tr></thead>\n  <tbody>\n    <tr><td><code>{{nome}}</code>'
# Find the closing </table> after this position
idx_b = c.find(anchor_b)
if idx_b > 0:
    # Find </table> after this position
    table_end = c.find('</table>', idx_b)
    if table_end > 0:
        insert_pos = table_end + len('</table>')
        c = c[:insert_pos] + EXEMPLO_PLACEHOLDER + c[insert_pos:]
        changes.append('✓ Pg 14: adicionado exemplo de uso dos placeholders')
    else:
        changes.append('✗ NÃO ENCONTRADO: </table> após placeholders')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora pg 14')

# ── FIX C: Pg 17 — "Estados da pesquisa" + tabela sozinha (~25%)
# Adiciona nota de troubleshooting após a tabela de estados
NOTA_ESTADOS = """</table>
<div class="note">
  <strong>Atenção:</strong> se o respondente acessar a pesquisa mas não vir as perguntas,
  verifique: (1) status está como <strong>Ativa</strong>? (2) data de abertura já passou?
  (3) comunidade da escola está instalada na pesquisa?
</div>"""

anchor_c = 'Fluxo normal de resposta</td></tr>\n  </tbody>\n</table>\n</section>'
if anchor_c in c:
    c = c.replace(
        anchor_c,
        'Fluxo normal de resposta</td></tr>\n  </tbody>\n' + NOTA_ESTADOS + '\n</section>',
        1
    )
    changes.append('✓ Pg 17: adicionada nota de troubleshooting após estados')
else:
    changes.append('✗ NÃO ENCONTRADO: âncora pg 17')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Fixes aplicados:')
for ch in changes:
    print(' ', ch)
