'use client'

import type { SurveyTheme, WelcomeStepDef } from '@/components/survey-engine/utils/types'
import { textAlignClassName, textAlignStyle } from '@/components/survey-engine/utils/textAlign'
import { interpolate } from '@/lib/interpolate'

interface WelcomeStepProps {
  step: WelcomeStepDef
  nome: string
  nomeAluno: string
  serie: string
  perfil: string
  tipo: string
  theme?: SurveyTheme
  onStart: () => void
}

export default function WelcomeStep({ step, nome, nomeAluno, serie, perfil, tipo, theme, onStart }: WelcomeStepProps) {
  const isResponsavel = perfil !== 'aluno'
  const nomeDaEscola = theme?.nomeEscola ?? tipo
  const placeholderVars = {
    nome,
    nomeAluno,
    serie,
    nomeEscola: nomeDaEscola,
    marca: theme?.marca ?? '',
    unidade: theme?.unidade ?? '',
  }

  // Título personalizado (ex: "Olá, {{nome}}")
  const welcomeTitle = step.titulo
    ? interpolate(step.titulo, placeholderVars)
    : null

  // Mensagem personalizada via admin (suporta {{nome}}, {{nomeAluno}}, {{serie}}, {{nomeEscola}})
  const welcomeBody = step.desc || theme?.welcomeMessage
    ? interpolate(step.desc || theme?.welcomeMessage || '', placeholderVars)
    : null
  const textAlign = step.textAlign ?? theme?.welcomeTextAlign ?? 'left'
  const alignStyle = textAlignStyle(textAlign)
  const alignClassName = textAlignClassName(textAlign)

  return (
    <div className={['welcome', alignClassName].filter(Boolean).join(' ')}>
      {theme?.logo && (
        <img src={theme.logo} alt={nomeDaEscola} className="school-logo" />
      )}
      {welcomeTitle && (
        <p className="welcome-greeting" style={alignStyle}>{welcomeTitle}</p>
      )}
      <div className="welcome-body" style={alignStyle}>
        {welcomeBody ? (
          <p style={{ whiteSpace: 'pre-wrap' }}>{welcomeBody}</p>
        ) : (
          <>
            {isResponsavel ? (
              <p>
                Que bom que você, responsável pelo(a) aluno(a) <strong>{nomeAluno || '[nome do aluno]'}</strong>,
                da <strong>{serie || '[série]'}</strong>, veio responder à nossa pesquisa.
                Sua participação é muito importante para nós.
              </p>
            ) : (
              <p>
                Que bom que você, aluno(a) da <strong>{serie || '[série]'}</strong>, veio responder à nossa pesquisa.
                Sua participação é muito importante para nós.
              </p>
            )}
            {isResponsavel ? (
              <p>
                Este questionário é utilizado pela {nomeDaEscola} como mais um canal de escuta ativa, para que possamos
                compreender melhor a experiência dos estudantes e das famílias e, a partir disso, continuar
                aprimorando nossos processos, atendimentos e atividades.
              </p>
            ) : (
              <p>
                Este questionário é utilizado pela {nomeDaEscola} como mais um canal de escuta ativa, para que possamos
                compreender melhor a experiência dos alunos e, a partir disso, continuar aprimorando nossos
                processos, atividades e o ambiente da {nomeDaEscola}.
              </p>
            )}
            <p>
              Suas respostas serão analisadas com atenção pela equipe da {nomeDaEscola} e contribuirão diretamente
              para a melhoria contínua do nosso trabalho.
            </p>
            <p>Agradecemos pelo seu tempo e pela sua colaboração.</p>
          </>
        )}
      </div>
      <div className="welcome-footer">
        <button className="btn btn-primary" onClick={onStart}>Começar →</button>
      </div>
    </div>
  )
}
