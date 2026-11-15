# Painel Bíblia 3D

Painel infantil gamificado do curso Bíblia 3D (originado de uma cópia de outro painel escolar).
Usa o mesmo projeto Supabase, em um schema separado (`?schema=biblia3d` na `DATABASE_URL`).

- Login das crianças: telefone do responsável (DDD + 9 dígitos) + senha inicial.
- Pontos, desafio do dia/semana, ranking, leilão às 19h, avaliação do professor, jogos.
- `_scripts/`: seeds de exemplo (leilão e jogos).

Segredos (`AUTH_SECRET`, `DATABASE_URL`, `SUPABASE_SECRET_KEY`) ficam só no ambiente do servidor, nunca no repositório.

Documentação: `DEPLOYMENT.md` (implantação, backup, rollback, com placeholders) e `TESTING.md` (testes). `HOMOLOGATION.md`, `REGISTRATION*.md` e `MARCO9.md` são histórico herdado.
