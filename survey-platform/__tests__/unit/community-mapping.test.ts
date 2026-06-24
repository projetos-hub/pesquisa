import { describe, expect, it } from 'vitest'
import { resolveCommunityId } from '@/lib/community-mapping'

describe('community-mapping', () => {
  it('resolves sample upload TOTVS aliases', () => {
    expect(resolveCommunityId('COLEGIO AMERICANO')).toBe('americano')
    expect(resolveCommunityId('COLEGIOS INTEGRADOS LEONARDO DA VINCI - GAMA')).toBe('leonardodavinci-gama')
    expect(resolveCommunityId('COLEGIO E CURSO MATRIZ EDUCACAO DUQUE DE CAXIAS')).toBe('matriz-caxias')
    expect(resolveCommunityId('COLEGIO E CURSO AO CUBO BOTAFOGO')).toBe('ns8z5w8m')
    expect(resolveCommunityId('COLEGIO E CURSO AO CUBO BARRA')).toBe('yxak8s0k')
    expect(resolveCommunityId('COLEGIO E CURSO CUBO BARRA GOLFE')).toBe('k4ys44r2')
    expect(resolveCommunityId('BOM TEMPO CRECHE E EDUCACAO INFANTIL LTDA')).toBe('n6k47n81')
    expect(resolveCommunityId('ESCOLA SA PEREIRA S.A. CAPISTRANO')).toBe('w213sfza')
    expect(resolveCommunityId('COLEGIO QI BOTAFOGO')).toBe('qi-botafogo')
  })
})
