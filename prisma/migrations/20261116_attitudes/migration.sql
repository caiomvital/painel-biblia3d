CREATE TYPE "AttitudeKind" AS ENUM ('POSITIVE', 'ATTENTION');

CREATE TABLE "Attitude" (
  "id" TEXT NOT NULL,
  "kind" "AttitudeKind" NOT NULL,
  "code" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "coins" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "day" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attitude_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Attitude_studentId_day_idx" ON "Attitude"("studentId", "day");
CREATE INDEX "Attitude_actorUserId_day_idx" ON "Attitude"("actorUserId", "day");
CREATE INDEX "Attitude_classId_createdAt_idx" ON "Attitude"("classId", "createdAt");
ALTER TABLE "Attitude" ADD CONSTRAINT "Attitude_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attitude" ADD CONSTRAINT "Attitude_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
