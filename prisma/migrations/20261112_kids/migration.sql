CREATE TYPE "QuizStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "QuizSource" AS ENUM ('AI', 'TEACHER', 'DIRECTOR');

ALTER TABLE "Student"
  ADD COLUMN "guardianName" TEXT,
  ADD COLUMN "guardianPhone" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "fucturaId" TEXT;
CREATE INDEX "Student_guardianPhone_idx" ON "Student"("guardianPhone");

CREATE TABLE "QuizQuestion" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "options" TEXT[],
  "correctIndex" INTEGER NOT NULL,
  "topic" TEXT,
  "status" "QuizStatus" NOT NULL DEFAULT 'PENDING',
  "source" "QuizSource" NOT NULL DEFAULT 'AI',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuizQuestion_status_idx" ON "QuizQuestion"("status");

CREATE TABLE "QuizDay" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "questionIds" TEXT[],
  "answers" JSONB NOT NULL DEFAULT '[]',
  "score" INTEGER NOT NULL DEFAULT 0,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuizDay_studentId_day_key" ON "QuizDay"("studentId", "day");
ALTER TABLE "QuizDay" ADD CONSTRAINT "QuizDay_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Prize" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "pointsGoal" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);
