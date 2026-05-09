'use client'

import type { SurveyTheme, WelcomeStepDef } from '@/components/survey-engine/utils/types'
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

  // Mensagem personalizada via admin (suporta {{nome}}, {{nomeAluno}}, {{serie}}, {{nomeEscola}})
  const welcomeBody = step.desc || theme?.welcomeMessage
    ? interpolate(step.desc || theme?.welcomeMessage || '', { nome, nomeAluno, serie, nomeEscola: nomeDaEscola })
    : null

  return (
    <div className="welcome">
      {theme?.logo && (
        <img src={theme.logo} alt={nomeDaEscola} className="school-logo" />
      )}
      <p className="welcome-greeting">
        Olá, <span>{nome || 'bem-vindo(a)'}.</span>
      </p>
      <div className="welcome-body">
        {welcomeBody ? (
          <p>{welcomeBody}</p>
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
