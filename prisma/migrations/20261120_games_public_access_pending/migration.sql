-- Jogos: o autor escolhe "Tornar público". Os jogos que já estavam aprovados continuam visíveis para todos.
ALTER TABLE "Game" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Game" SET "isPublic" = true WHERE "status" = 'APPROVED';

-- Cadastro: aluno novo fica aguardando a equipe liberar. Quem já existe não é afetado (default false).
ALTER TABLE "Student" ADD COLUMN "accessPending" BOOLEAN NOT NULL DEFAULT false;
