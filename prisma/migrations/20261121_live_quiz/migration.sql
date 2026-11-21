-- Quiz ao vivo: sala com PIN, equipes/solo, jogadores e respostas. Só tabelas novas.
CREATE TYPE "LiveQuizStatus" AS ENUM ('LOBBY', 'QUESTION', 'REVEAL', 'FINISHED');

CREATE TABLE "LiveQuiz" (
    "id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "status" "LiveQuizStatus" NOT NULL DEFAULT 'LOBBY',
    "questionIds" TEXT[],
    "currentIndex" INTEGER NOT NULL DEFAULT -1,
    "questionStartedAt" TIMESTAMP(3),
    "secondsPerQuestion" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "LiveQuiz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveQuizTeam" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "LiveQuizTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveQuizPlayer" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teamId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveQuizPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveQuizAnswer" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "choice" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "elapsedMs" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveQuizAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiveQuiz_pin_status_idx" ON "LiveQuiz"("pin", "status");
CREATE INDEX "LiveQuiz_teacherId_status_idx" ON "LiveQuiz"("teacherId", "status");
CREATE INDEX "LiveQuizTeam_quizId_idx" ON "LiveQuizTeam"("quizId");
CREATE UNIQUE INDEX "LiveQuizPlayer_quizId_studentId_key" ON "LiveQuizPlayer"("quizId", "studentId");
CREATE INDEX "LiveQuizPlayer_studentId_idx" ON "LiveQuizPlayer"("studentId");
CREATE UNIQUE INDEX "LiveQuizAnswer_playerId_questionIndex_key" ON "LiveQuizAnswer"("playerId", "questionIndex");
CREATE INDEX "LiveQuizAnswer_quizId_questionIndex_idx" ON "LiveQuizAnswer"("quizId", "questionIndex");

ALTER TABLE "LiveQuizTeam" ADD CONSTRAINT "LiveQuizTeam_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LiveQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveQuizPlayer" ADD CONSTRAINT "LiveQuizPlayer_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LiveQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveQuizPlayer" ADD CONSTRAINT "LiveQuizPlayer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveQuizPlayer" ADD CONSTRAINT "LiveQuizPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "LiveQuizTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveQuizAnswer" ADD CONSTRAINT "LiveQuizAnswer_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LiveQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LiveQuizAnswer" ADD CONSTRAINT "LiveQuizAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "LiveQuizPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
