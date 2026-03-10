'use client'

interface WelcomeStepProps {
  nome: string
  nomeAluno: string
  serie: string
  perfil: string
  tipo: string
  onStart: () => void
}

export default function WelcomeStep({ nome, nomeAluno, serie, perfil, tipo, onStart }: WelcomeStepProps) {
  const isResponsavel = perfil !== 'aluno'
  return (
    <div className="welcome">
      <p className="welcome-greeting">
        Olá, <span>{nome || 'bem-vindo(a)'}.</span>
      </p>
      <div className="welcome-body">
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
            Este questionário é utilizado pela {tipo} como mais um canal de escuta ativa, para que possamos
            compreender melhor a experiência dos estudantes e das famílias e, a partir disso, continuar
            aprimorando nossos processos, atendimentos e atividades.
          </p>
        ) : (
          <p>
            Este questionário é utilizado pela {tipo} como mais um canal de escuta ativa, para que possamos
            compreender melhor a experiência dos alunos e, a partir disso, continuar aprimorando nossos
            processos, atividades e o ambiente da {tipo}.
          </p>
        )}
        <p>
          Suas respostas serão analisadas com atenção pela equipe da {tipo} e contribuirão diretamente
          para a melhoria contínua do nosso trabalho.
        </p>
        <p>Agradecemos pelo seu tempo e pela sua colaboração.</p>
      </div>
      <div className="welcome-footer">
        <button className="btn btn-primary" onClick={onStart}>Começar →</button>
      </div>
    </div>
  )
}
