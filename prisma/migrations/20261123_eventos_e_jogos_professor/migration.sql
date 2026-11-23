-- Eventos da escola e dono do jogo enviado pelo professor. Só acrescenta (coluna opcional e tabela nova).
ALTER TABLE "Game" ADD COLUMN "authorUserId" TEXT;
CREATE INDEX "Game_authorUserId_idx" ON "Game"("authorUserId");

CREATE TABLE "SchoolEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "classId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchoolEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SchoolEvent_startsAt_idx" ON "SchoolEvent"("startsAt");
CREATE INDEX "SchoolEvent_classId_idx" ON "SchoolEvent"("classId");
ALTER TABLE "SchoolEvent" ADD CONSTRAINT "SchoolEvent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
