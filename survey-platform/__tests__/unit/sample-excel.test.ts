import { describe, expect, it } from 'vitest'

import { extractSampleExcelRow } from '@/lib/sample-excel'
import { repairMojibake } from '@/lib/sample-upload-text'

describe('sample excel encoding', () => {
  it('repairs common mojibake sequences from Excel text', () => {
    expect(repairMojibake('usu\u00c3\u00a1rios')).toBe('usu\u00e1rios')
    expect(repairMojibake('\u00e2\u20ac\u201d')).toBe('\u2014')
    expect(repairMojibake('C\u00c3\u00b3digo')).toBe('C\u00f3digo')
    expect(repairMojibake('\u00c3\u2021\u00c3\u00b3digo')).toBe('\u00c7\u00f3digo')
  })

  it('extracts values when headers and cells arrive mojibaked', () => {
    const row = {
      NOME: 'Jo\u00c3\u00a3o Silva',
      NOMEFANTASIA: 'COL\u00c3\u2030GIO QI FREGUESIA',
      'EMAIL RESP ACAD': 'RESPONSAVEL@ESCOLA.COM.BR',
    }

    expect(extractSampleExcelRow(row)).toEqual({
      nome: 'Jo\u00e3o Silva',
      nomefantasia: 'COL\u00c9GIO QI FREGUESIA',
      emails: ['responsavel@escola.com.br'],
    })
  })

  it('matches aliases after repairing mojibaked header names', () => {
    const row = {
      ALUNO: 'Maria',
      FILIAL: 'Escola Teste',
      'EMAIL RESP ACAD\u00c3\u0160MICO': 'maria@example.com',
    }

    expect(extractSampleExcelRow(row).emails).toEqual(['maria@example.com'])
  })

  it('extracts only financial responsible email when RF mode is selected', () => {
    const row = {
      ALUNO: 'Maria',
      FILIAL: 'Escola Teste',
      EMAIL_ALUNO: 'aluno@example.com',
      EMAIL_RESP_FINANCEIRO: 'financeiro@example.com',
      EMAIL_RESP_ACADEMICO: 'academico@example.com',
    }

    expect(extractSampleExcelRow(row, 'financial_responsible').emails).toEqual(['financeiro@example.com'])
  })
})
