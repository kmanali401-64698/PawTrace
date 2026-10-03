-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clinic" TEXT;

-- CreateTable
CREATE TABLE "PetVetAccess" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "referredById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "PetVetAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PetVetAccess_vetId_status_idx" ON "PetVetAccess"("vetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PetVetAccess_petId_vetId_key" ON "PetVetAccess"("petId", "vetId");

-- AddForeignKey
ALTER TABLE "PetVetAccess" ADD CONSTRAINT "PetVetAccess_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetVetAccess" ADD CONSTRAINT "PetVetAccess_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetVetAccess" ADD CONSTRAINT "PetVetAccess_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: vets who already wrote reports for a pet keep approved access to it
INSERT INTO "PetVetAccess" ("id", "petId", "vetId", "status", "source", "createdAt", "decidedAt")
SELECT 'bf_' || md5(r."petId" || ':' || r."vetId"), r."petId", r."vetId", 'approved', 'owner', MIN(r."createdAt"), MIN(r."createdAt")
FROM "Report" r
GROUP BY r."petId", r."vetId"
ON CONFLICT ("petId", "vetId") DO NOTHING;
