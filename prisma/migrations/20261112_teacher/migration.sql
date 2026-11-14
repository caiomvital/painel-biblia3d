CREATE TYPE "QuizKind" AS ENUM ('DAILY', 'WEEKLY');

ALTER TABLE "QuizQuestion"
  ADD COLUMN "kind" "QuizKind" NOT NULL DEFAULT 'DAILY',
  ADD COLUMN "classId" TEXT,
  ADD COLUMN "teacherId" TEXT;
CREATE INDEX "QuizQuestion_kind_classId_idx" ON "QuizQuestion"("kind", "classId");

CREATE TABLE "LessonReport" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "topics" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonReport_classId_day_key" ON "LessonReport"("classId", "day");
CREATE INDEX "LessonReport_teacherId_idx" ON "LessonReport"("teacherId");
ALTER TABLE "LessonReport" ADD CONSTRAINT "LessonReport_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonReport" ADD CONSTRAINT "LessonReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LessonCheck" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "checked" INTEGER[],
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonCheck_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonCheck_studentId_reportId_key" ON "LessonCheck"("studentId", "reportId");
ALTER TABLE "LessonCheck" ADD CONSTRAINT "LessonCheck_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonCheck" ADD CONSTRAINT "LessonCheck_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "LessonReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeacherPoint" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "originReference" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherPoint_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherPoint_teacherId_originReference_key" ON "TeacherPoint"("teacherId", "originReference");
CREATE INDEX "TeacherPoint_teacherId_idx" ON "TeacherPoint"("teacherId");
ALTER TABLE "TeacherPoint" ADD CONSTRAINT "TeacherPoint_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
