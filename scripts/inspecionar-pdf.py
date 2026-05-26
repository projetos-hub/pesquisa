import sys, fitz, os
sys.stdout.reconfigure(encoding='utf-8')

pdf_path  = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-visual.pdf'
out_dir   = r'C:\Users\lucas.mesquita\Desktop\PROJETOS - TECNOLOGIA\pesquisa\docs\playbook-preview'

os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
print(f'Total de páginas: {doc.page_count}')

for i, page in enumerate(doc, 1):
    pix = page.get_pixmap(dpi=120)
    path = os.path.join(out_dir, f'pagina-{i:02d}.png')
    pix.save(path)
    print(f'  ✓ pagina-{i:02d}.png  ({page.rect.width:.0f}x{page.rect.height:.0f}pt)')

print(f'\nPNGs em: {out_dir}')
