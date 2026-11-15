# Implantação do Painel Bíblia 3D

Guia de operação com **placeholders**. Substitua `<...>` pelos valores do seu ambiente; nenhum IP, domínio, e-mail ou segredo real deve entrar neste repositório.

> Este arquivo substitui o antigo guia de homologação herdado da Fuctura. Os documentos `HOMOLOGATION.md` e `MARCO9.md` são histórico desse painel e não descrevem a operação do Bíblia 3D.

## 1. Visão geral

- Aplicação Next.js (standalone) rodando como serviço `systemd` atrás do Nginx, em `127.0.0.1:<PORTA_INTERNA>`.
- Banco: PostgreSQL gerenciado (Supabase), **schema próprio `biblia3d`** (`?schema=biblia3d` em `DATABASE_URL` **e** em `DIRECT_URL`). O mesmo projeto pode ser compartilhado com outros sistemas; nunca aponte para outro schema.
- Código em `/opt/painel-biblia3d` (clone Git; deploy por `git merge --ff-only origin/main`).
- Segredos só no arquivo de ambiente do servidor (`<ARQUIVO_DE_AMBIENTE>`, permissão 600, fora do repositório).

## 2. Variáveis de ambiente (nomes, sem valores)

`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `NODE_ENV=production`, `HOSTNAME=127.0.0.1`, `PORT=<PORTA_INTERNA>`, mais as chaves do Supabase que o projeto exigir. Valide com `bun scripts/check-production-config.ts`.

## 3. Serviço systemd

Modelo em `deploy/biblia3d.service.example`. Substitua todos os `REPLACE_*`, instale em `/etc/systemd/system/biblia3d.service` e rode `systemctl daemon-reload && systemctl enable --now biblia3d`.

## 4. Nginx e HTTPS

Modelo em `deploy/nginx.conf.example` (proxy para loopback, limite de requisições no login, log sem IP/cookies/query). Substitua `REPLACE_DOMAIN`, portas e caminhos do certificado; valide com `nginx -t` e recarregue. Certificado via `<FERRAMENTA_DE_CERTIFICADO>` (ex.: certbot).

## 5. Publicar uma versão

```sh
cd /opt/painel-biblia3d
git fetch origin && git merge --ff-only origin/main
# se houver migration nova: faça o backup (seção 6) e aplique SÓ ela, ANTES do código novo
npx prisma migrate deploy
npx prisma generate
npx next build
node scripts/prepare-standalone.mjs
chown -R <USUARIO_DO_SERVICO>: .next
systemctl restart biblia3d
curl -s http://127.0.0.1:<PORTA_INTERNA>/api/health/ready   # deve responder 200
```

Antes de publicar, anote o commit em produção (`git rev-parse --short HEAD`): ele é o ponto de rollback (`git checkout <COMMIT_ANTERIOR>` + build + restart). Migrations são **aditivas**; a coluna extra de uma versão mais nova é inofensiva no rollback.

## 6. Backup e restauração (schema `biblia3d`)

```sh
pg_dump "<URL_DIRETA_SEM_PARAMETROS_PRISMA>?sslmode=require" \
  --schema=biblia3d --format=custom --no-owner --no-acl -f <ARQUIVO>.dump
chmod 600 <ARQUIVO>.dump        # contém dados de crianças: guardar com cuidado
```

Teste a restauração num Postgres descartável (nunca em produção):

```sh
docker run -d --name restore-test -e POSTGRES_PASSWORD=<SENHA_DESCARTAVEL> postgres:17-alpine
docker exec restore-test psql -U postgres -c "create database restore_check"
docker cp <ARQUIVO>.dump restore-test:/tmp/b.dump
docker exec restore-test pg_restore -U postgres -d restore_check --no-owner --exit-on-error /tmp/b.dump
# compare contagens das tabelas com as de produção; depois: docker rm -f restore-test
```

Ainda não há rotina agendada de backup; o `scripts/backup-and-verify-production.mjs` é herança da Fuctura (manual, só schema `public`) e **não** cobre o `biblia3d`.

## 7. Verificação rápida pós-deploy

Health `ready` 200; login de teste responde 200; rotas de aluno respondem 401 sem sessão; a rota de jogar traz `Content-Security-Policy` com `sandbox` e `frame-ancestors 'self'`.

## 8. Testes

Veja `TESTING.md` (Postgres descartável em Docker, um arquivo e2e por vez com banco recriado).
