-- =============================================================
-- Seed: Pesquisa +RAIZ 2026 - Versao Identificada
-- Origem: Pesquisa +RAIZ - Versao Identificada.pdf
-- Publico: responsaveis
-- Acesso inicial: aberta, para avaliacao. Trocar para 'amostra' quando a base estiver fechada.
-- =============================================================

ALTER TABLE questions
  DROP CONSTRAINT IF EXISTS questions_type_check;

ALTER TABLE questions
  ADD CONSTRAINT questions_type_check
  CHECK (type IN ('welcome','nps','scale','scale_sections','radio','text','thankyou','checkbox','file_upload'));

DO $$
DECLARE
  v_survey_id UUID;
  q_rota UUID;
  q_part_atividades UUID;
  q_part_tempo UUID;
  q_part_nps UUID;
  q_part_motivo_nps UUID;
  q_part_avaliacao UUID;
  q_part_positivos UUID;
  q_part_melhorar UUID;
  q_part_continuidade UUID;
  q_part_motivo_saida UUID;
  q_part_interesse UUID;
  q_part_comentarios UUID;
  q_nao_historico UUID;
  q_nao_motivos UUID;
  q_nao_motivo_outro UUID;
  q_nao_experimentar UUID;
  q_nao_investimento UUID;
  q_nao_interesses UUID;
  q_nao_condicoes UUID;
  q_nao_comentarios UUID;
  comm TEXT;
BEGIN
  INSERT INTO surveys (
    slug,
    title,
    description,
    survey_type,
    target_roles,
    status,
    access_control,
    open_date,
    close_date,
    settings
  )
  VALUES (
    'mais-raiz-2026',
    '+RAIZ - Pesquisa de Satisfação',
    'Pesquisa identificada sobre atividades extracurriculares do +RAIZ.',
    'quantitativa',
    ARRAY['responsavel'],
    'ativa',
    'aberta',
    NULL,
    NULL,
    jsonb_build_object(
      'theme', jsonb_build_object(
        'primaryColor', '#1f8f4d',
        'secondaryColor', '#f2b705',
        'thankyouMessage', 'Obrigado(a) pela sua resposta! Ela contribui diretamente para a melhoria do +RAIZ.'
      )
    )
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    survey_type = EXCLUDED.survey_type,
    target_roles = EXCLUDED.target_roles,
    status = EXCLUDED.status,
    access_control = EXCLUDED.access_control,
    settings = EXCLUDED.settings,
    updated_at = NOW()
  RETURNING id INTO v_survey_id;

  DELETE FROM questions WHERE survey_id = v_survey_id;

  INSERT INTO questions (survey_id, order_index, type, key, title, description, required)
  VALUES (
    v_survey_id,
    0,
    'welcome',
    'welcome',
    'Bem-vindo(a)',
    'Queremos ouvir sua percepção sobre as atividades extracurriculares do +RAIZ. A pesquisa é identificada para que possamos analisar as respostas por comunidade e segmento.',
    false
  );

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    1,
    'radio',
    'participacao_mais_raiz',
    'Participacao no +RAIZ',
    true,
    jsonb_build_object(
      'pergunta', 'O(a) aluno(a) participa atualmente de atividades extracurriculares do +RAIZ?',
      'branchFlow', jsonb_build_object(
        'type', 'answer_routes',
        'routes', jsonb_build_array(
          jsonb_build_object('value', 'Sim, participa atualmente', 'blockId', 'participante', 'blockLabel', 'Aluno(a) participante do +RAIZ'),
          jsonb_build_object('value', 'Nao participa atualmente', 'blockId', 'nao_participante', 'blockLabel', 'Aluno(a) nao participante do +RAIZ')
        )
      )
    )
  ) RETURNING id INTO q_rota;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_rota, 0, 'Sim, participa atualmente', 'sim'),
    (q_rota, 1, 'Nao participa atualmente', 'nao');

  -- Fluxo: aluno(a) participante do +RAIZ
  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    2,
    'text',
    'atividades_participa',
    'Aluno(a) participante do +RAIZ',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'Qual(is) atividade(s) extracurricular(es) o(a) aluno(a) participa?',
      'placeholder', 'Se mais de uma, separe por virgula.'
    )
  ) RETURNING id INTO q_part_atividades;

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    3,
    'radio',
    'tempo_participacao',
    'Tempo de participacao',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'Ha quanto tempo o(a) aluno(a) participa da(s) atividade(s) extracurricular(es)?'
    )
  ) RETURNING id INTO q_part_tempo;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_tempo, 0, 'Menos de 3 meses', 'menos_3_meses'),
    (q_part_tempo, 1, 'Entre 3 e 6 meses', '3_6_meses'),
    (q_part_tempo, 2, 'Entre 6 meses e 1 ano', '6_12_meses'),
    (q_part_tempo, 3, 'Mais de 1 ano', 'mais_1_ano');

  INSERT INTO questions (survey_id, order_index, type, key, title, description, required, settings)
  VALUES (
    v_survey_id,
    4,
    'nps',
    'nps_mais_raiz',
    'Indicacao das atividades extracurriculares',
    '0 = nao recomendaria de jeito nenhum | 10 = recomendaria com certeza',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'order', 'asc',
      'lowLabel', 'Nao recomendaria de jeito nenhum',
      'highLabel', 'Recomendaria com certeza'
    )
  ) RETURNING id INTO q_part_nps;

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    5,
    'text',
    'motivo_nps_mais_raiz',
    'Motivo da nota',
    false,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'Por qual motivo voce atribuiu essa nota?',
      'placeholder', 'Escreva aqui o motivo da sua nota.'
    )
  ) RETURNING id INTO q_part_motivo_nps;

  INSERT INTO questions (survey_id, order_index, type, key, title, description, required, settings)
  VALUES (
    v_survey_id,
    6,
    'scale',
    'avaliacao_aspectos_mais_raiz',
    'Avaliacao dos aspectos',
    'Avalie de 1 a 5: 1 = Pessimo, 2 = Ruim, 3 = Regular, 4 = Bom, 5 = Otimo.',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ'
    )
  ) RETURNING id INTO q_part_avaliacao;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_avaliacao, 0, 'Qualidade e conteudo da atividade', 'qualidade_conteudo'),
    (q_part_avaliacao, 1, 'Preparo e engajamento do(a) professor(a) / instrutor(a)', 'preparo_engajamento'),
    (q_part_avaliacao, 2, 'Horario e duracao das aulas', 'horario_duracao'),
    (q_part_avaliacao, 3, 'Desenvolvimento pessoal e social do(a) aluno(a)', 'desenvolvimento_pessoal_social'),
    (q_part_avaliacao, 4, 'Desenvolvimento tecnico e cognitivo percebido', 'desenvolvimento_tecnico_cognitivo'),
    (q_part_avaliacao, 5, 'Relacao custo-beneficio (valor investido x resultado)', 'custo_beneficio'),
    (q_part_avaliacao, 6, 'Comunicacao e suporte da equipe', 'comunicacao_suporte');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    7,
    'checkbox',
    'aspectos_positivos',
    'Aspectos positivos',
    false,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'Quais aspectos voce considera positivos? Marque todos os que se aplicam.',
      'sortOptions', false
    )
  ) RETURNING id INTO q_part_positivos;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_positivos, 0, 'Qualidade e conteudo da atividade', 'qualidade_conteudo'),
    (q_part_positivos, 1, 'Preparo e engajamento do(a) professor(a)', 'preparo_engajamento'),
    (q_part_positivos, 2, 'Horario e duracao das aulas', 'horario_duracao'),
    (q_part_positivos, 3, 'Desenvolvimento pessoal e social', 'desenvolvimento_pessoal_social'),
    (q_part_positivos, 4, 'Desenvolvimento tecnico e cognitivo', 'desenvolvimento_tecnico_cognitivo'),
    (q_part_positivos, 5, 'Relacao custo-beneficio', 'custo_beneficio'),
    (q_part_positivos, 6, 'Comunicacao e suporte da equipe', 'comunicacao_suporte');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    8,
    'checkbox',
    'aspectos_melhorar',
    'Aspectos a melhorar',
    false,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'E quais precisam melhorar? Marque todos os que se aplicam.',
      'sortOptions', false
    )
  ) RETURNING id INTO q_part_melhorar;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_melhorar, 0, 'Qualidade e conteudo da atividade', 'qualidade_conteudo'),
    (q_part_melhorar, 1, 'Preparo e engajamento do(a) professor(a)', 'preparo_engajamento'),
    (q_part_melhorar, 2, 'Horario e duracao das aulas', 'horario_duracao'),
    (q_part_melhorar, 3, 'Desenvolvimento pessoal e social', 'desenvolvimento_pessoal_social'),
    (q_part_melhorar, 4, 'Desenvolvimento tecnico e cognitivo', 'desenvolvimento_tecnico_cognitivo'),
    (q_part_melhorar, 5, 'Relacao custo-beneficio', 'custo_beneficio'),
    (q_part_melhorar, 6, 'Comunicacao e suporte da equipe', 'comunicacao_suporte');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    9,
    'radio',
    'continuidade_proximo_ciclo',
    'Continuidade no proximo ciclo',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'O(a) aluno(a) continuara nas atividades no proximo ciclo?',
      'branchFlow', jsonb_build_object(
        'type', 'answer_routes',
        'routes', jsonb_build_array(
          jsonb_build_object('value', 'Provavelmente nao', 'blockId', 'participante_nao_continua', 'blockLabel', 'Motivo para nao continuar'),
          jsonb_build_object('value', 'Certamente nao', 'blockId', 'participante_nao_continua', 'blockLabel', 'Motivo para nao continuar')
        )
      )
    )
  ) RETURNING id INTO q_part_continuidade;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_continuidade, 0, 'Certamente sim', 'certamente_sim'),
    (q_part_continuidade, 1, 'Provavelmente sim', 'provavelmente_sim'),
    (q_part_continuidade, 2, 'Ainda nao decidi', 'ainda_nao_decidi'),
    (q_part_continuidade, 3, 'Provavelmente nao', 'provavelmente_nao'),
    (q_part_continuidade, 4, 'Certamente nao', 'certamente_nao');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    10,
    'checkbox',
    'motivo_nao_continuar',
    'Motivo para nao continuar',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante_nao_continua',
      'flowBlockLabel', 'Motivo para nao continuar',
      'pergunta', 'Qual o principal motivo?',
      'sortOptions', false
    )
  ) RETURNING id INTO q_part_motivo_saida;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_motivo_saida, 0, 'Preco / custo das atividades', 'preco_custo'),
    (q_part_motivo_saida, 1, 'O(a) aluno(a) perdeu o interesse', 'perdeu_interesse'),
    (q_part_motivo_saida, 2, 'Conflito de horarios', 'conflito_horarios'),
    (q_part_motivo_saida, 3, 'Qualidade abaixo do esperado', 'qualidade_abaixo'),
    (q_part_motivo_saida, 4, 'Mudanca de escola ou cidade', 'mudanca_escola_cidade');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    11,
    'checkbox',
    'interesse_outras_atividades',
    'Interesse em outras atividades',
    true,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'O(a) aluno(a) tem interesse em experimentar outras atividades? Se sim, quais?',
      'sortOptions', false
    )
  ) RETURNING id INTO q_part_interesse;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_part_interesse, 0, 'Nao tem interesse em ampliar a participacao', 'sem_interesse'),
    (q_part_interesse, 1, 'Artes (musica, percussao, circo, pintura, fotografia)', 'artes'),
    (q_part_interesse, 2, 'Esportes (futsal, basquete, ginastica ritmica, cheerleader)', 'esportes'),
    (q_part_interesse, 3, 'Audiovisual (video, fotografia, design grafico, roteiro)', 'audiovisual'),
    (q_part_interesse, 4, 'Desenvolvimento pessoal (empreendedorismo, lideranca, financas)', 'desenvolvimento_pessoal'),
    (q_part_interesse, 5, 'Idiomas', 'idiomas'),
    (q_part_interesse, 6, 'Midias (escrita criativa, jornal escolar)', 'midias'),
    (q_part_interesse, 7, 'Tecnologia (programacao, design de jogos, RA/RV, animacao)', 'tecnologia');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    12,
    'text',
    'comentarios_participante',
    'Sugestoes e comentarios',
    false,
    jsonb_build_object(
      'flowBlockId', 'participante',
      'flowBlockLabel', 'Aluno(a) participante do +RAIZ',
      'pergunta', 'Deixe sugestoes ou comentarios para tornar as atividades extracurriculares ainda melhores.',
      'placeholder', 'Escreva sua sugestao ou comentario aqui.'
    )
  ) RETURNING id INTO q_part_comentarios;

  -- Fluxo: aluno(a) nao participante do +RAIZ
  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    13,
    'radio',
    'ja_participou_antes',
    'Aluno(a) nao participante do +RAIZ',
    true,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'O(a) aluno(a) ja participou da(s) atividade(s) extracurricular(es) em algum ciclo anterior?'
    )
  ) RETURNING id INTO q_nao_historico;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_nao_historico, 0, 'Sim, ja participou antes', 'sim_antes'),
    (q_nao_historico, 1, 'Nao, nunca participou', 'nunca_participou');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    14,
    'checkbox',
    'motivos_nao_participa',
    'Motivos da nao participacao',
    true,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'Quais sao os principais motivos pelos quais o(a) aluno(a) nao participa atualmente?',
      'sortOptions', false,
      'branchFlow', jsonb_build_object(
        'type', 'answer_routes',
        'routes', jsonb_build_array(
          jsonb_build_object('value', 'Outro', 'blockId', 'nao_participante_outro', 'blockLabel', 'Outro motivo')
        )
      )
    )
  ) RETURNING id INTO q_nao_motivos;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_nao_motivos, 0, 'O valor das atividades nao cabe no orçamento familiar', 'orcamento'),
    (q_nao_motivos, 1, 'Horario das atividades conflita com a rotina do(a) aluno(a)', 'conflito_rotina'),
    (q_nao_motivos, 2, 'Nao recebi informacoes suficientes sobre o que e oferecido', 'falta_informacao'),
    (q_nao_motivos, 3, 'As atividades disponiveis nao despertam interesse do(a) aluno(a)', 'sem_interesse_atividades'),
    (q_nao_motivos, 4, 'A rotina escolar ja e intensa (especialmente Ensino Medio)', 'rotina_intensa'),
    (q_nao_motivos, 5, 'Dificuldade de transporte / logistica', 'logistica'),
    (q_nao_motivos, 6, 'As atividades nao contemplam o segmento / faixa etaria do(a) aluno(a)', 'segmento_faixa_etaria'),
    (q_nao_motivos, 7, 'Outro', 'outro');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    15,
    'text',
    'motivo_nao_participa_outro',
    'Outro motivo',
    false,
    jsonb_build_object(
      'flowBlockId', 'nao_participante_outro',
      'flowBlockLabel', 'Outro motivo',
      'pergunta', 'Se marcou Outro, descreva o principal motivo.',
      'placeholder', 'Descreva aqui.'
    )
  ) RETURNING id INTO q_nao_motivo_outro;

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    16,
    'checkbox',
    'condicoes_experimentar',
    'Condicoes para experimentar',
    true,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'O que precisaria acontecer para o(a) aluno(a) experimentar uma atividade?',
      'sortOptions', false
    )
  ) RETURNING id INTO q_nao_experimentar;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_nao_experimentar, 0, 'Uma aula experimental gratuita', 'aula_experimental'),
    (q_nao_experimentar, 1, 'Preco mais acessivel ou desconto na primeira matricula', 'preco_desconto'),
    (q_nao_experimentar, 2, 'O(a) proprio(a) aluno(a) pedir para participar', 'aluno_pedir'),
    (q_nao_experimentar, 3, 'Indicacao de outra familia ou aluno(a)', 'indicacao'),
    (q_nao_experimentar, 4, 'Informacoes mais claras e detalhadas sobre as atividades', 'informacoes_claras'),
    (q_nao_experimentar, 5, 'Horarios mais flexiveis ou compativeis com a rotina', 'horarios_flexiveis'),
    (q_nao_experimentar, 6, 'Uma atividade especifica que o(a) aluno(a) gostaria e ainda nao e oferecida', 'atividade_especifica'),
    (q_nao_experimentar, 7, 'Nada - nao tenho interesse no momento', 'sem_interesse_momento');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    17,
    'radio',
    'faixa_investimento',
    'Faixa de investimento',
    true,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'Qual faixa de investimento mensal seria viavel para uma atividade?'
    )
  ) RETURNING id INTO q_nao_investimento;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_nao_investimento, 0, 'Ate R$ 100', 'ate_100'),
    (q_nao_investimento, 1, 'De R$ 101 a R$ 150', '101_150'),
    (q_nao_investimento, 2, 'De R$ 151 a R$ 200', '151_200'),
    (q_nao_investimento, 3, 'De R$ 201 a R$ 250', '201_250'),
    (q_nao_investimento, 4, 'Acima de R$ 250', 'acima_250'),
    (q_nao_investimento, 5, 'Qualquer valor, se o(a) aluno(a) quiser participar', 'qualquer_valor'),
    (q_nao_investimento, 6, 'Nao tenho disponibilidade financeira no momento', 'sem_disponibilidade');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    18,
    'checkbox',
    'atividades_interesse_nao_participante',
    'Atividades de interesse',
    true,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'Que tipo de atividades teriam mais chance de interessar ao(a) aluno(a)?',
      'sortOptions', false
    )
  ) RETURNING id INTO q_nao_interesses;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_nao_interesses, 0, 'Artes (musica, percussao, circo, pintura, fotografia, costura)', 'artes'),
    (q_nao_interesses, 1, 'Esportes (futsal, basquete, ginastica ritmica, cheerleader)', 'esportes'),
    (q_nao_interesses, 2, 'Audiovisual (video, fotografia, design grafico, roteiro)', 'audiovisual'),
    (q_nao_interesses, 3, 'Desenvolvimento pessoal (empreendedorismo, lideranca, financas)', 'desenvolvimento_pessoal'),
    (q_nao_interesses, 4, 'Idiomas', 'idiomas'),
    (q_nao_interesses, 5, 'Midias (escrita criativa, jornal escolar)', 'midias'),
    (q_nao_interesses, 6, 'Tecnologia (programacao, design de jogos, RA/RV, animacao 2D/3D)', 'tecnologia'),
    (q_nao_interesses, 7, 'Nenhuma das opcoes', 'nenhuma');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    19,
    'checkbox',
    'condicoes_adesao',
    'Condicoes que facilitariam adesao',
    true,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'Quais condicoes facilitariam a adesao?',
      'sortOptions', false
    )
  ) RETURNING id INTO q_nao_condicoes;

  INSERT INTO question_options (question_id, order_index, label, value) VALUES
    (q_nao_condicoes, 0, 'Desconto para irmaos matriculados na mesma escola', 'desconto_irmaos'),
    (q_nao_condicoes, 1, 'Pacote com mais de uma atividade a preco diferenciado', 'pacote_atividades'),
    (q_nao_condicoes, 2, 'Periodo de teste gratuito ou com custo reduzido', 'periodo_teste'),
    (q_nao_condicoes, 3, 'Bolsa parcial baseada em criterio socioeconomico', 'bolsa_parcial'),
    (q_nao_condicoes, 4, 'Parcelamento facilitado ou pagamento via cartao de credito', 'parcelamento'),
    (q_nao_condicoes, 5, 'Atividades em contraturno (manha para quem estuda a tarde e vice-versa)', 'contraturno'),
    (q_nao_condicoes, 6, 'Nenhuma das opcoes ajudaria', 'nenhuma');

  INSERT INTO questions (survey_id, order_index, type, key, title, required, settings)
  VALUES (
    v_survey_id,
    20,
    'text',
    'comentarios_nao_participante',
    'Sugestoes e comentarios',
    false,
    jsonb_build_object(
      'flowBlockId', 'nao_participante',
      'flowBlockLabel', 'Aluno(a) nao participante do +RAIZ',
      'pergunta', 'Deixe sugestoes ou comentarios para que as atividades extracurriculares possam atender melhor ao(a) aluno(a).',
      'placeholder', 'Escreva sua sugestao ou comentario aqui.'
    )
  ) RETURNING id INTO q_nao_comentarios;

  INSERT INTO questions (survey_id, order_index, type, key, title, required)
  VALUES (v_survey_id, 21, 'thankyou', 'thankyou', 'Obrigado(a)!', false);

  FOR comm IN
    SELECT DISTINCT community_id
    FROM (
      SELECT community_id FROM communities
      UNION
      SELECT community_id FROM survey_communities WHERE active = true
    ) AS all_communities
    WHERE community_id IS NOT NULL AND btrim(community_id) <> ''
  LOOP
    INSERT INTO survey_communities (
      survey_id,
      community_id,
      status,
      open_date,
      close_date,
      theme,
      active
    )
    VALUES (
      v_survey_id,
      comm,
      'ativa',
      NULL,
      NULL,
      '{}'::jsonb,
      true
    )
    ON CONFLICT (survey_id, community_id) DO UPDATE SET
      status = EXCLUDED.status,
      open_date = EXCLUDED.open_date,
      close_date = EXCLUDED.close_date,
      active = EXCLUDED.active,
      updated_at = NOW();
  END LOOP;
END $$;
