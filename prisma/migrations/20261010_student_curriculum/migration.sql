CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Curriculum_userId_key" ON "Curriculum"("userId");
CREATE UNIQUE INDEX "Curriculum_objectKey_key" ON "Curriculum"("objectKey");
CREATE INDEX "Curriculum_uploadedAt_idx" ON "Curriculum"("uploadedAt");

ALTER TABLE "Curriculum"
ADD CONSTRAINT "Curriculum_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
