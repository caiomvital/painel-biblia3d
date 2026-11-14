# Painel Bíblia 3D

Cópia do painel do aluno da Fuctura, adaptada para o curso Bíblia 3D (painel infantil gamificado).
Usa o mesmo projeto Supabase, em um schema separado (`?schema=biblia3d` na `DATABASE_URL`).

- Login das crianças: telefone do responsável (DDD + 9 dígitos) + senha inicial.
- Pontos, desafio do dia/semana, ranking, leilão às 19h, avaliação do professor, jogos.
- `_scripts/`: seeds de exemplo (leilão e jogos).

Segredos (`AUTH_SECRET`, `DATABASE_URL`, `SUPABASE_SECRET_KEY`) ficam só no ambiente do servidor, nunca no repositório.
