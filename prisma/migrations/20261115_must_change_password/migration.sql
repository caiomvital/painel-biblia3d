-- Aditiva: nova coluna com valor padrão. Contas existentes e novas começam exigindo a troca de senha.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
