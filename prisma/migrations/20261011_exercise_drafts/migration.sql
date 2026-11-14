ALTER TABLE "ClassExercise" ADD COLUMN "publishedAt" TIMESTAMP(3);
UPDATE "ClassExercise" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL;
CREATE INDEX "ClassExercise_publishedAt_idx" ON "ClassExercise"("publishedAt");
