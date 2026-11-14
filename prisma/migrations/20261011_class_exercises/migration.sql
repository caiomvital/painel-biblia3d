CREATE TABLE "ClassExercise" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "correctXp" INTEGER NOT NULL,
    "correctCoins" INTEGER NOT NULL,
    "attemptXp" INTEGER NOT NULL,
    "attemptCoins" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassExerciseAttempt" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "coinsAwarded" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassExerciseAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassExercise_classId_createdAt_idx" ON "ClassExercise"("classId", "createdAt");
CREATE UNIQUE INDEX "ClassExerciseAttempt_exerciseId_studentId_key" ON "ClassExerciseAttempt"("exerciseId", "studentId");
CREATE INDEX "ClassExerciseAttempt_studentId_answeredAt_idx" ON "ClassExerciseAttempt"("studentId", "answeredAt");
ALTER TABLE "ClassExercise" ADD CONSTRAINT "ClassExercise_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExerciseAttempt" ADD CONSTRAINT "ClassExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "ClassExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassExerciseAttempt" ADD CONSTRAINT "ClassExerciseAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
