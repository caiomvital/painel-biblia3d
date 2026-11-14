# Testes automatizados

Requisitos: Node.js 24, Bun 1.4.2, PostgreSQL 17 e Chromium do Playwright.
Nenhuma conexão de CI aponta para o Supabase e nenhum deploy é executado.

## Banco descartável

Uma opção para iniciar o PostgreSQL de testes:

```sh
npm run test:db:up
```

O Compose usa PostgreSQL 17, igual ao CI. A porta 54329 aceita conexões apenas
da própria máquina e os dados ficam em memória, sem volume persistente. Para
encerrar e descartar o banco:

```sh
npm run test:db:down
```

Na raiz do checkout, configure a conexão e instale as dependências:

```sh
export TEST_DATABASE_URL=postgresql://fuctura_test:local-tests-only@127.0.0.1:54329/fuctura_local_test
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
npm run test:all
```

Instale Node.js 24, Bun 1.4.2 e Docker Compose antes de executar os comandos.
O banco é exclusivo para testes e é removido ao parar o serviço; não há volume persistente.
Os scripts exigem host loopback, protocolo PostgreSQL e nome terminado em `_test`.
`DATABASE_URL` e `DIRECT_URL` são substituídas pela conexão de testes nos subprocessos.
As migrations são aplicadas somente após essa validação. Não forneça credenciais reais.
O nome `_test` não transforma um banco compartilhado em descartável: crie um banco exclusivo.

## Comandos

- `npm run test:unit`: testes de parsing e das proteções do banco, sem escrita.
- `npm run test:integration`: migrations no banco autorizado e suítes de integração dos Marcos 7, 8 e 9 e comparação de schema.
- `npm run test:e2e`: prepara dados próprios e executa Chromium com login real e PostgreSQL real.
- `npm run test:all`: Prisma validate/generate, migrations, unitários, TypeScript da aplicação e da suíte, ESLint, build, integração e E2E.
- `npm run test:supabase`: diagnóstico separado e somente de leitura da conexão Supabase configurada em `SUPABASE_DATABASE_URL` ou `DATABASE_URL`.

Os comandos de integração/E2E exigem `TEST_DATABASE_URL`. Playwright inicia uma aplicação
própria na porta 3100 e recusa reutilizar um servidor já iniciado. Desktop e mobile têm
fixtures separadas. Os testes de serviços criam e removem seus registros; E2E usa
setup/teardown com IDs exclusivos por execução. Se o processo for interrompido à força,
descarte o banco local antes da próxima execução.

Se a porta 3100 estiver ocupada, defina `TEST_APP_PORT` com uma porta livre
entre 1024 e 65535. E2E mantém bind em loopback, não reutiliza o servidor existente
e usa saída `.next-e2e-<porta>` separada. Os cabeçalhos Origin dos testes acompanham
essa porta; não encerre processos existentes para abrir espaço para a suíte.
Para repetir uma parte da suíte após diagnóstico, os argumentos adicionais são
encaminhados ao Playwright, por exemplo:
`npm run test:e2e -- --project=desktop tests/e2e/panel.spec.ts`.
As rotas protegidas são preparadas por GETs anônimos antes dos testes, sempre
exigindo resposta 401. O servidor exclusivo de E2E retém as rotas compiladas
durante a execução. O grupo antigo de diário (várias edições/recarregamentos e
trocas de perfil) e o cadastro com vários contextos têm orçamento total de
150 segundos por cenário; os limites das asserções permanecem iguais.

Em ambientes com Chromium instalado e download restrito, defina
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Na CI, usa-se o navegador
instalado pelo Playwright. Não desative verificação TLS para baixar navegadores.

## Marco 8 — professor

O mesmo `npm run test:all` executa `scripts/test-marco8.ts` depois do Marco 7.
A integração verifica escopo por professor, IDs forjados, diário persistido,
confirmações simultâneas/duplicadas, rejeição sem recompensa e reconciliação dos
ledgers. `tests/e2e/teacher.spec.ts` cobre as cinco áreas, próxima aula, cronograma,
tópicos e links, filtros, confirmação/rejeição, indicadores e frequência em desktop
e mobile, com login e PostgreSQL reais. Fixtures ficam exclusivamente no banco
isolado; nenhum comando desta suíte usa o Supabase compartilhado.

## Cobertura e artefatos

E2E valida os papéis professor, aluno e diretor em 1440×900 e 390×844, recarregamento,
edição/exclusão, permissões por interface e HTTP autenticado, campos acessíveis,
ausência de overflow da página e erros JS/HTTP/transporte inesperados.
Respostas 401 iniciais de sessão e recusas 403 intencionais são resultados esperados.
Não há mocks de autenticação ou persistência.

Screenshots dos três papéis e traces ficam em `test-results/`; o relatório HTML fica
em `playwright-report/`. Os artefatos contêm apenas credenciais e dados descartáveis
de teste e não são versionados. Screenshots servem à revisão; não atestam qualidade estética.

O diagnóstico Supabase nunca executa migrations, seeds ou escritas. Testa conexão,
colunas/tipos/nulabilidade e leituras essenciais. Sem acesso real, registra a etapa `FALHOU` e as etapas dependentes `NÃO EXECUTADA`
em `test-results/supabase.json`, com código de saída 1; isso não significa aprovação.
Veja [SUPABASE.md](SUPABASE.md) para TLS, tipos de pooler, limites de rede e plano
de migrations posterior com backup e autorização.

## Preferências, avisos, auditoria e relatórios

`tests/unit/panel.test.ts` verifica as entradas de preferências e troca de senha,
incluindo o limite bcrypt em bytes, os filtros de relatórios e a proteção contra
fórmulas em CSV. Integra a suíte unitária existente.

`scripts/test-panel.ts` integra `test:integration` e `test:all`. Usa exclusivamente
o banco local descartável validado: testa preferências por conta, alteração
concorrente de senha, recusa de sessão antiga, próxima aula no horário de Recife,
frequência por período, escopo do professor, rollback da auditoria e avisos reais
de aprovação, lance superado e encerramento. A verificação de prontidão simula
a ausência da conclusão da migração nova no histórico do banco de testes e restaura
o registro em `finally`; não usa o Supabase nem o banco publicado.

`tests/e2e/panel.spec.ts` integra `test:e2e` e `test:all` em desktop e mobile.
Verifica seleção e nova busca de aluno, recuperação de falha na leitura de
preferências, persistência de cor/texto, paginação e leitura de avisos, isolamento
entre destinatários, permissões de diretor, histórico, exportação CSV e troca de
senha com duas sessões reais. A conta de troca de senha é própria desse teste.
Somente o cenário de falha temporária de preferências intercepta leituras;
autenticação, persistência, revogação e demais APIs usam a aplicação e PostgreSQL reais.

## CI

`.github/workflows/tests.yml` executa em PRs e pushes para `main`, com PostgreSQL
temporário próprio, e publica relatórios, screenshots e traces mesmo após falhas.
O resultado local não comprova a execução no GitHub Actions: consulte a execução
associada ao commit/PR. O workflow não contém deploy nem credenciais do Supabase.

## Marco 9 — diretor

`scripts/test-marco9.ts` integra a mesma execução e cobre indicadores reais,
criação/edição de turmas e professores, matrículas e duplicidade concorrente,
preservação de histórico, diário, confirmações concorrentes, rejeição sem
recompensa, reconexão e integridade de saldos/ledgers/reservas.
`tests/e2e/director.spec.ts` usa login real, percorre as seis áreas, cadastra e
edita registros, atribui professor, matricula aluno, filtra o cronograma, edita
diário, resolve presenças e verifica autorização administrativa por HTTP para
aluno e professor, em desktop e mobile. Também cobre ajustes manuais de XP/Coins e
criação, edição e encerramento de lotes pelos controles existentes. Os novos registros também são removidos
pelo teardown usando o identificador exclusivo da execução.

Não há nova migration no Marco 9. Curso e módulos são consultados conforme o
modelo existente; não existe associação individual de módulo à turma no schema.
A responsabilidade atual do professor pode ser removida sem apagar o professor
registrado na aula. Matrículas usam os estados existentes ACTIVE, COMPLETED e
DROPPED, sem exclusão de histórico. Turmas com histórico devem ser encerradas
(FINISHED), não excluídas. O painel não infere aula ministrada pela data passada.
Frequência divide presenças confirmadas por registros resolvidos
(PRESENT/ABSENT/EXCUSED); pendências e aulas sem registro não criam faltas.

A direção consulta leilões sem gerar dados demonstrativos. Ajustes de XP e Coins
continuam usando os serviços e ledgers existentes; débitos manuais de Coins
não podem consumir valores reservados. Encerrar lote reutiliza o motor atual,
e lotes com histórico não podem ser excluídos. A suíte usa exclusivamente o
PostgreSQL local autorizado, incluindo os testes financeiros.
