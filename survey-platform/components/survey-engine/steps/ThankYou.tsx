'use client'

import type { SurveyTheme } from '@/components/survey-engine/utils/types'
import { interpolate } from '@/lib/interpolate'

interface ThankYouProps {
  nps: number | undefined
  perfil: string
  nomeAluno: string
  school: string
  tipo: string
  theme?: SurveyTheme
  indicacaoLinks?: Record<string, string>
}

export default function ThankYou({ nps, perfil, nomeAluno, school, tipo, theme, indicacaoLinks }: ThankYouProps) {
  const nomeDaEscola = theme?.nomeEscola ?? tipo
  const isResponsavel = perfil !== 'aluno'
  const score = Number(nps)
  const isPromotor = score >= 9
  const isNeutro   = score >= 7 && score <= 8
  const isDetrator = score <= 6
  const linkIndicacao = indicacaoLinks?.[school] ?? null

  // Mensagem personalizada via admin (suporta {{nomeAluno}}, {{nomeEscola}}, etc.)
  if (theme?.thankyouMessage) {
    const texto = interpolate(theme.thankyouMessage, {
      nomeAluno,
      nomeEscola: nomeDaEscola,
    })
    return (
      <div className="thankyou">
        <div className="icon">🎉</div>
        <h2>Obrigado pela sua avaliação!</h2>
        <p>{texto}</p>
      </div>
    )
  }

  // ── Aluno ──────────────────────────────────────────────────────────────────
  if (!isResponsavel) {
    return (
      <div className="thankyou">
        <div className="icon">{isDetrator ? '💬' : '🎉'}</div>
        <h2>Obrigado pelo seu feedback!</h2>
        {(isPromotor || isNeutro) && (
          <p>
            Obrigado por compartilhar sua avaliação e por fazer parte da nossa {nomeDaEscola}.<br /><br />
            É muito importante para nós saber como você tem vivido sua experiência aqui e entender
            o que funciona bem para você.<br /><br />
            Se quiser, pode também contar para amigos ou familiares sobre a {nomeDaEscola} e o que você gosta por aqui.
          </p>
        )}
        {isDetrator && (
          <p>
            Obrigado por compartilhar sua avaliação e por fazer parte da nossa {nomeDaEscola}.<br /><br />
            Sua opinião é importante para a gente entender o que pode ser melhorado na sua experiência aqui.<br /><br />
            A {nomeDaEscola} está aberta para conversar sempre que você quiser contar suas ideias ou sugestões.
          </p>
        )}
      </div>
    )
  }

  const nomeReferencia = nomeAluno || 'seu(sua) filho(a)'

  // ── Responsável — Promotor ─────────────────────────────────────────────────
  if (isPromotor) {
    return (
      <div className="thankyou">
        <div className="icon">🎉</div>
        <h2>Obrigado pela sua avaliação!</h2>
        <p>
          Agradecemos pela sua avaliação e pela confiança na nossa {nomeDaEscola}.<br /><br />
          É muito importante para nós saber que a experiência de <strong>{nomeReferencia}</strong> está alinhada
          com as expectativas da sua família em relação ao que a {nomeDaEscola} se propõe a entregar.<br /><br />
          Caso conheça outras famílias que possam se conectar com a proposta da {nomeDaEscola},
          você pode compartilhar este link de indicação:
        </p>
        {linkIndicacao && (
          <div className="thankyou-link-box">
            <a href={linkIndicacao} target="_blank" rel="noreferrer">{linkIndicacao}</a>
          </div>
        )}
        <p style={{ marginTop: 16 }}>
          Obrigado por caminhar junto com a gente na educação de <strong>{nomeReferencia}</strong>.
        </p>
      </div>
    )
  }

  // ── Responsável — Neutro ───────────────────────────────────────────────────
  if (isNeutro) {
    return (
      <div className="thankyou">
        <div className="icon">🙏</div>
        <h2>Obrigado pela sua avaliação!</h2>
        <p>
          Agradecemos pela sua avaliação e por fazer parte da nossa {nomeDaEscola}.<br /><br />
          Sua opinião é importante e ajuda a gente a entender como tornar a experiência
          de <strong>{nomeReferencia}</strong> ainda melhor.
          Estamos à disposição para conversar sempre que quiser compartilhar suas ideias.<br /><br />
          Se conhecer famílias que se identifiquem com a proposta da {nomeDaEscola}, compartilhe o link:
        </p>
        {linkIndicacao && (
          <div className="thankyou-link-box">
            <a href={linkIndicacao} target="_blank" rel="noreferrer">{linkIndicacao}</a>
          </div>
        )}
      </div>
    )
  }

  // ── Responsável — Detrator ─────────────────────────────────────────────────
  return (
    <div className="thankyou">
      <div className="icon">💬</div>
      <h2>Obrigado pela sua avaliação!</h2>
      <p>
        Agradecemos pela sua avaliação e por fazer parte da nossa {nomeDaEscola}.<br /><br />
        Sua opinião é muito importante para nós. Em breve, nossa equipe diretiva entrará em
        contato para conversarmos e entender de que forma podemos tornar a trajetória
        de <strong>{nomeReferencia}</strong> na {nomeDaEscola} ainda melhor.<br /><br />
        Agradecemos por dedicar um tempo para compartilhar suas percepções conosco.
      </p>
    </div>
  )
}
