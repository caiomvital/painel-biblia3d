# Painel Bíblia 3D: o que tem, o que não tem e o planejamento

Estado em 25/11/2026. Produção: https://biblia3d.69.169.102.111.sslip.io (VPS, serviço `biblia3d`, porta 3200). O PRD está em `docs/PRD.md`.

## 1. O que já tem (em produção)

### Criança
- **Login** pelos 8 últimos dígitos do telefone do responsável (ou telefone completo) e senha; escolha de filho quando o telefone tem mais de um; troca de senha obrigatória no primeiro acesso (mínimo 5).
- **Tela inicial** em estilo de jogo, igual em celular, app instalado e computador, sem rolagem: faixa do "Olá" com baú em quadradinho, Desafio e Leilão lado a lado, O que aprendi, e no computador Quiz ao vivo, Jogos e Ranking.
- **Desafio do dia e da semana**, uma pergunta por vez, contagem de pontos com moedas subindo e tela "Missão cumprida" com efeitos.
- **Leilão** com fichas, lances a partir das 19h (Recife), retirar lance, vitrine com carrossel na tela inicial.
- **O que aprendi:** checklist dos tópicos da aula registrados pelo professor.
- **XP e nível** com curva crescente; **fichas**; **ranking** só com posições; sequência de dias.
- **Baús** por nível, sequência, atitudes, Desafios (a cada 5) e O que aprendi (a cada 3), com sorteio no servidor.
- **Lofi** (mascote) com personalização, Coleção e Guarda-roupa; **Davi** como guia.
- **XP por toque em botão:** 1 XP, 20 s entre toques, até 15 por dia, sem fichas.
- **Temas visuais** (padrão azul-ardósia, livres, bíblicos e por nível), efeito e som ao subir de nível.
- **Eventos da escola**, avisos, avaliação semanal do professor (nota, "gostando?" e comentário).
- **Jogos:** biblioteca, enviar jogo, tornar público, rodando em sandbox.
- **Quiz ao vivo** (sala de aula, computador).
- **Menu** de três pontinhos no canto superior direito com todos os ajustes (som, tamanho do texto, tema, Davi, conta).
- **PWA** instalável.

### Professor
- Registrar a aula e os tópicos; perguntas da turma; atitudes; confirmar/rejeitar presença; exercícios; Quiz ao vivo; jogos; avaliações da turma sem nomes.

### Direção
- Crianças (cadastro, edição, liberação de acesso pendente, senha), turmas, professores, cursos, currículos.
- Aprovação de perguntas e de jogos; prêmios e leilões; histórico de lances; relatórios, busca, auditoria; link de avaliação do Google.

### Plataforma
- Banco Postgres local no próprio VPS, com backup diário (03:30, 14 dias) e espelho no Supabase.
- Testes automatizados (unitários e e2e), health checks e deploy manual documentado.
- Painel lateral de **contas de teste** (20 contas `teste.*`, senha `demo123`), ligado por variável de ambiente.

## 2. O que não tem (ou está incompleto)

| Item | Situação |
|---|---|
| **Novo visual do Lofi** | Proposta guardada em stash (`lofi-svg-novo-conceito-1`); falta aprovação do Caio e do Diógenes. Animações em WebP exportadas, ainda sem integração. |
| **Jogos de Construct 3** | Decisão pendente de como integrar (aceitar o `.zip` exportado, converter para HTML único etc.). O Diógenes pediu para juntar as partes de JesusJump e As Aventuras de Davi em um único jogo. |
| **Conteúdo real de aula** | Faltam tópicos (ideal: 7 por aula) e perguntas por aula, a cargo do Jônatas. Hoje o Desafio usa o banco de perguntas aprovadas. |
| **Link de avaliação do Google** | Campo existe, mas ainda precisa ser preenchido. |
| **Foto da criança** | Não existe. |
| **Cadastro de professor** | Só a direção cria; não há auto-cadastro. |
| **Tela de responsável** | Não existe (o telefone dele é só o login). |
| **Ilustrações de Jogos, Leilão, Quiz e Ranking no mesmo estilo 3D** | Só Desafio, Quiz e O que aprendi têm arte própria; Jogos e Ranking usam emoji. |
| **Código sem uso** | A tela "Dia" (DayScreen) e o card "Prêmio do mês" ficaram no código, sem botão que leve a elas. |
| **Testes automáticos no GitHub** | Falta workflow de CI (precisa de permissão `workflow` no token). |
| **Teste em aparelho real** | O PWA e a tela sem rolagem foram testados em simulação; falta conferir em celulares reais de tamanhos variados. |
| **Documentação de operação** | `DEPLOYMENT.md` ainda diz que não há backup agendado; está desatualizado. |
| **Repositório** | Público, com IP e e-mail no histórico (limpeza de histórico não foi feita). |

## 3. Dados de teste em produção

- Contas `teste.*` e turmas `B3D-T1..T3` (ranking da escola mistura essas crianças com as reais). A limpeza só acontece quando o Caio mandar.
- Turma vazia `B3D-TESTE` pode ser apagada.
- Contas reais adicionadas manualmente: duas crianças (Julia e Bernardo).

## 4. Decisões recentes (nesta rodada)

- Desafio e Leilão são o centro da tela inicial; o resto é adicional.
- Quiz ao vivo só no computador.
- Prêmio do mês (sanduíche, guaraná e picolé) faz parte do Leilão e saiu da tela inicial.
- Curva de XP crescente; níveis dos alunos existentes recalculados em produção (33 alunos, 18 mudaram).
- XP por toque com intervalo de 20 s e teto diário.
- Tela de descrição do Desafio removida.

## 5. Planejamento sugerido

**Curto prazo (próximas 1 a 2 semanas)**
1. Validar a nova tela inicial em celulares reais e com o Diógenes.
2. Receber tópicos e perguntas do Jônatas e cadastrar o conteúdo das aulas de sábado.
3. Decidir os jogos de Construct 3 e começar a integração.
4. Calibrar XP, fichas e preços do Leilão com uso real; ajustar o XP por toque se necessário.
5. Preencher o link de avaliação do Google.

**Médio prazo (1 a 2 meses)**
1. Aprovar e integrar o novo Lofi e suas animações.
2. Criar ilustrações 3D para Jogos, Leilão e Ranking.
3. CI no GitHub (testes em cada PR).
4. Atualizar `DEPLOYMENT.md` e remover código sem uso.
5. Rotina de revisão semanal do Leilão (criar prêmios, fechar leilões).

**Antes do lançamento oficial**
1. Limpar contas e turmas de teste.
2. Decidir sobre o repositório público e o histórico.
3. Definir o plano de subdomínio próprio (hoje é um endereço `sslip.io`).
4. Cadastrar as crianças reais, professores e turmas e fazer o treinamento.

**Ideias futuras**
- Tela para responsáveis.
- Foto da criança e perfil.
- Eventos e missões sazonais (Black Friday do Leilão).
- Mais fontes de baú e itens do Lofi.

## 6. Referências

- `docs/PRD.md`: requisitos do produto.
- `DEPLOYMENT.md`: implantação, backup e rollback.
- `TESTING.md`: como rodar os testes.
- `README-BIBLIA3D.md`: visão geral.
