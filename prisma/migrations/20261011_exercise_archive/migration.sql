ALTER TABLE "ClassExercise" ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE INDEX "ClassExercise_archivedAt_idx" ON "ClassExercise"("archivedAt");
