# PRD: Painel Bíblia 3D

Documento de requisitos do produto. Estado em 25/11/2026. O que já existe e o que falta está em `docs/STATUS.md`.

## 1. Visão

Um painel em formato de jogo que faz crianças do curso Bíblia 3D (Fuctura Tecnologia) quererem voltar todo dia: estudar, responder o Desafio, acompanhar a aula e disputar prêmios no Leilão. A criança deve sentir que está num jogo, não num sistema escolar. Professores e direção usam as mesmas informações para acompanhar a turma e premiar boas atitudes.

**Dono do produto:** Diógenes (Fuctura). **Desenvolvimento:** Caio.

## 2. Problema e objetivo

- As crianças têm pouco motivo para se envolver com o curso fora da aula.
- Professores e direção não têm um jeito simples de reconhecer participação e atitude.
- O curso precisa de um canal próprio, seguro para menores (sem nomes de colegas, sem conteúdo livre de outros alunos, jogos em área isolada).

**Objetivo:** aumentar a frequência de acesso, a participação no Desafio e o engajamento com a aula, sem expor dados de crianças.

## 3. Usuários

| Perfil | O que precisa |
|---|---|
| **Criança (aluno)** | Entrar fácil, ver o que fazer agora, ganhar recompensas visíveis, participar do Leilão, jogar. |
| **Professor** | Registrar a aula do dia, criar perguntas, dar atitudes positivas/negativas, confirmar presença, rodar o Quiz ao vivo, ver a avaliação da turma. |
| **Direção (Diógenes)** | Cadastrar crianças, turmas e professores, aprovar perguntas e jogos, criar prêmios e leilões, ver relatórios e histórico. |
| **Responsável** | Não tem tela própria: o telefone dele é o login da criança. |

## 4. Princípios de produto

1. **O Desafio e o Leilão são o centro.** O resto é adicional e fica em segundo plano na tela inicial.
2. **Cara de jogo:** botões grandes e ilustrados, cores fortes, efeitos de recompensa. Evitar cards e caixas de sistema.
3. **Cabe na tela, sem rolar** (celular, app instalado e computador). Informação redundante é agrupada.
4. **Segurança de menores:** ranking mostra só posição; jogos rodam em iframe isolado e só ficam visíveis após aprovação; nada de chat nem texto livre entre crianças.
5. **O servidor decide recompensas.** Pontos, fichas, baús e sorteios são calculados no servidor, nunca no aparelho.
6. **Tom infantil e sóbrio onde importa:** o Leilão tem visual de vitrine, não de brinquedo.

## 5. Requisitos funcionais

### 5.1 Acesso
- Criança entra com **login = 8 últimos dígitos do telefone do responsável** (ou o telefone completo) + senha.
- Se o mesmo telefone tem mais de um filho, o painel pergunta quem entra.
- Primeira senha deve ser trocada no primeiro acesso (mínimo de 5 letras ou números).
- Professor e direção entram com usuário e senha próprios.
- App instalável (PWA) e uso pelo navegador, no celular e no computador.

### 5.2 Progressão e recompensas
- **XP e nível:** nível por curva crescente. Entrada no nível n = (n-1)(15n-20): 0, 10, 50, 120, 220, 350 XP...
- **Fichas:** moeda para o Leilão. 1 XP = 1 ficha na maior parte das fontes; gastar fichas não reduz XP nem posição no ranking.
- **Fontes de XP:** acesso diário, presença confirmada, Desafio (1 por resposta, 5 por acerto, bônus por concluir), checklist "O que aprendi" (por tópico marcado), atitudes do professor, cadastro completo, exercícios do professor, **toque em botão** (1 XP, mínimo 20 s entre toques, teto de 15 por dia, sem fichas).
- **Baús (sem compra):** por subir de nível; por sequência de dias (3, 7, 14, 30); a cada 5 atitudes positivas; **a cada 5 Desafios concluídos**; **a cada 3 registros do "O que aprendi"**. Conteúdo: itens do Lofi sorteados no servidor (comum 60%, raro 28%, épico 10%, lendário 2%); item repetido vira fichas.
- **Tela de resultado** ("Missão cumprida") com efeitos, ao concluir o Desafio.

### 5.3 Tela inicial (criança)
- **Faixa do "Olá":** Lofi, nome, nível/XP (computador), posição na turma e na escola (computador) e o **baú** como detalhe: quadradinho com o número de baús numa bola vermelha, apagado quando não há baú.
- **Desafio e Leilão** lado a lado, logo abaixo.
- **O que aprendi** abaixo (apagado enquanto o professor não registrou a aula; mostra os assuntos do dia).
- **Computador:** Quiz ao vivo, Jogos e Ranking na mesma fileira; evento e aviso de cadastro só se sobrar altura.
- **Menu (3 pontinhos, canto superior direito):** perfil, eventos, ranking, avisos, som, tamanho do texto, Davi, tema, minha conta, meus dados, sair.

### 5.4 Desafio
- Desafio do dia: 5 perguntas iguais para todos, aprovadas pela direção antes de aparecerem. Desafio da semana por turma, com perguntas do professor aprovadas pela direção.
- Uma pergunta por vez, com resposta conferida na hora. Ao concluir, a contagem de pontos e a tela "Missão cumprida" levam direto ao início (sem tela de descrição).

### 5.5 Leilão
- Prêmios reais (por exemplo, lanches) disputados com fichas. Lance crescente; vence o maior lance no fim do prazo definido pela direção.
- Lances só a partir das 19h (Recife). A criança pode **retirar o lance** e as fichas voltam.
- Na tela inicial: vitrine com **carrossel** dos prêmios, lance atual e tempo restante; no computador, a faixa de fichas disponíveis logo abaixo.

### 5.6 Aula e Quiz ao vivo
- Professor registra os tópicos da aula; a criança marca o que aprendeu ("O que aprendi").
- **Quiz ao vivo** é para a sala de aula, com PIN, **somente no computador**.

### 5.7 Jogos
- Jogos prontos e jogos enviados por alunos e professores. Todo jogo novo passa por aprovação da direção. Rodam isolados, sem acesso à rede.
- Meta futura: reunir as partes dos jogos da Fuctura (ex.: JesusJump, As Aventuras de Davi) num único jogo.

### 5.8 Lofi, Davi e personalização
- Lofi é o mascote. Itens (cores, acessórios, cenários, molduras) vêm dos baús; Coleção e Guarda-roupa.
- Davi é o tutor/guia, com falas curtas.
- Temas visuais (paleta azul-ardósia como padrão; temas livres, bíblicos e por nível).

### 5.9 Professor
- Registrar aula; criar perguntas da turma; dar atitudes; confirmar ou rejeitar presença; criar exercícios; rodar Quiz ao vivo; criar jogos; ver a avaliação da turma (sem nomes).

### 5.10 Direção
- Cadastrar e liberar crianças, turmas, professores e cursos; aprovar perguntas e jogos; criar prêmios e leilões; ver relatórios, histórico de lances e auditoria; configurar o link de avaliação do Google.

### 5.11 Avaliação do professor
- Criança dá nota de 1 a 10, "está gostando?" e comentário uma vez por semana (+5 pontos). O convite para avaliar no Google aparece para toda criança, qualquer nota.

## 6. Requisitos não funcionais

- **Desempenho:** a tela inicial carrega rápido no celular; sem rolagem na tela inicial em celular, app e computador (janelas a partir de ~600 px de altura).
- **Segurança:** segredos só no servidor; sessões; jogos em sandbox com CSP restritiva; sem nomes de colegas em nenhuma resposta da API.
- **Privacidade:** dados de crianças tratados como sensíveis; backups com acesso restrito.
- **Acessibilidade:** respeitar movimento reduzido; rótulos em botões; tamanho de texto ajustável; contraste adequado.
- **Operação:** deploy manual com health check; backup do banco; rollback por commit.

## 7. Fora do escopo (por enquanto)

- Tela própria para responsáveis.
- Chat ou conteúdo livre entre crianças.
- Compra de baús ou itens com dinheiro real.
- Integração para gravar dados de volta no sistema da Fuctura.

## 8. Métricas de sucesso (propostas)

- Crianças ativas por semana / matriculadas.
- % que conclui o Desafio do dia.
- Média de dias seguidos de acesso.
- Participação no Leilão (crianças com ao menos um lance por semana).
- % de "O que aprendi" marcados nas aulas com tópicos registrados.
- Nota média do professor e % que clica no convite do Google.

## 9. Riscos e perguntas em aberto

- **Economia do jogo:** a curva de XP, o XP por toque e os preços do Leilão precisam ser calibrados com uso real (risco de inflação de pontos ou de prêmios inalcançáveis).
- **Exploits:** XP por toque tem teto diário; monitorar abuso.
- **Conteúdo:** depende de professores enviarem tópicos e perguntas a tempo.
- **Dados de teste em produção** misturam-se às crianças reais no ranking da escola; limpar antes do lançamento.
- **Mascote:** a nova versão do Lofi aguarda aprovação.
- **Repositório público** com informações do servidor no histórico.
