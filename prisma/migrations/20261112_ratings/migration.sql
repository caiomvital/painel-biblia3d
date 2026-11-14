CREATE TYPE "Enjoy" AS ENUM ('YES', 'SO_SO', 'NO');

CREATE TABLE "TeacherRating" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "week" TEXT NOT NULL,
  "enjoying" "Enjoy" NOT NULL,
  "score" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherRating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherRating_studentId_week_key" ON "TeacherRating"("studentId", "week");
CREATE INDEX "TeacherRating_teacherId_idx" ON "TeacherRating"("teacherId");
ALTER TABLE "TeacherRating" ADD CONSTRAINT "TeacherRating_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherRating" ADD CONSTRAINT "TeacherRating_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);
