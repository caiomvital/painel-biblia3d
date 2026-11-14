CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "authorName" TEXT NOT NULL,
  "authorStudentId" TEXT,
  "html" TEXT NOT NULL,
  "status" "GameStatus" NOT NULL DEFAULT 'PENDING',
  "plays" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Game_status_idx" ON "Game"("status");
