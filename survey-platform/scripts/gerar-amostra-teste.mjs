import ExcelJS from 'exceljs'
import path    from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const workbook = new ExcelJS.Workbook()
const sheet    = workbook.addWorksheet('Amostra')

// Colunas esperadas pelo SampleUpload.tsx
sheet.columns = [
  { header: 'NOME',                 key: 'NOME',               width: 30 },
  { header: 'NOMEFANTASIA',         key: 'NOMEFANTASIA',       width: 25 },
  { header: 'EMAIL INSTITUCIONAL',  key: 'EMAIL INSTITUCIONAL',width: 35 },
  { header: 'EMAIL RESP FIN',       key: 'EMAIL RESP FIN',     width: 35 },
  { header: 'EMAIL RESP ACAD',      key: 'EMAIL RESP ACAD',    width: 35 },
]

// Dados de teste — emails reais para validar resolução Layers
// Nomes TOTVS exatos conforme community-mapping.ts
sheet.addRow({
  'NOME':                'Lucas Mesquita',
  'NOMEFANTASIA':        'RAIZ EDUCAÇÃO',
  'EMAIL INSTITUCIONAL': 'lucas.mesquita@raizeducacao.com.br',
  'EMAIL RESP FIN':      '',
  'EMAIL RESP ACAD':     '',
})
sheet.addRow({
  'NOME':                'Responsável Teste 1',
  'NOMEFANTASIA':        'COLÉGIO QI RECREIO',
  'EMAIL INSTITUCIONAL': '',
  'EMAIL RESP FIN':      'teste.responsavel1@exemplo.com.br',
  'EMAIL RESP ACAD':     'teste.responsavel1@exemplo.com.br',
})
sheet.addRow({
  'NOME':                'Responsável Teste 2',
  'NOMEFANTASIA':        'COLÉGIO MATRIZ EDUCAÇÃO TIJUCA',
  'EMAIL INSTITUCIONAL': '',
  'EMAIL RESP FIN':      'teste.responsavel2@exemplo.com.br',
  'EMAIL RESP ACAD':     '',
})

// Estilo do cabeçalho
sheet.getRow(1).font      = { bold: true }
sheet.getRow(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
sheet.getRow(1).alignment = { horizontal: 'center' }

const output = path.join(__dirname, '..', 'amostra-teste.xlsx')
await workbook.xlsx.writeFile(output)
console.log('✅ Arquivo gerado:', output)
