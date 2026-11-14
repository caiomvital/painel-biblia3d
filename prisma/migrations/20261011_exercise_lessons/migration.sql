ALTER TABLE "ClassExercise" ADD COLUMN "lessonId" TEXT;
CREATE INDEX "ClassExercise_lessonId_createdAt_idx" ON "ClassExercise"("lessonId", "createdAt");
ALTER TABLE "ClassExercise" ADD CONSTRAINT "ClassExercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
