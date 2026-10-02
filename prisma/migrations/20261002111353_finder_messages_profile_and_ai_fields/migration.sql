-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_petId_fkey";

-- DropForeignKey
ALTER TABLE "ScanLog" DROP CONSTRAINT "ScanLog_petId_fkey";

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "publicNotes" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "aiSummarized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "careInstructions" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "FinderMessage" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "name" TEXT,
    "contact" TEXT,
    "message" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinderMessage_petId_createdAt_idx" ON "FinderMessage"("petId", "createdAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinderMessage" ADD CONSTRAINT "FinderMessage_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
