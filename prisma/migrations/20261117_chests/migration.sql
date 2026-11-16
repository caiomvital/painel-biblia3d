CREATE TYPE "ItemSlot" AS ENUM ('COLOR', 'ACCESSORY', 'BACKGROUND', 'FRAME');
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');

CREATE TABLE "CosmeticItem" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slot" "ItemSlot" NOT NULL,
  "rarity" "Rarity" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "CosmeticItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CosmeticItem_code_key" ON "CosmeticItem"("code");

CREATE TABLE "Chest" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "originReference" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3),
  "itemId" TEXT,
  "duplicateCoins" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Chest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Chest_studentId_originReference_key" ON "Chest"("studentId", "originReference");
CREATE INDEX "Chest_studentId_openedAt_idx" ON "Chest"("studentId", "openedAt");
ALTER TABLE "Chest" ADD CONSTRAINT "Chest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chest" ADD CONSTRAINT "Chest_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CosmeticItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudentItem" (
  "studentId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentItem_pkey" PRIMARY KEY ("studentId", "itemId")
);
ALTER TABLE "StudentItem" ADD CONSTRAINT "StudentItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentItem" ADD CONSTRAINT "StudentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CosmeticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
