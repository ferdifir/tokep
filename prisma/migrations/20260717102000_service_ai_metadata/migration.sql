-- AlterTable
ALTER TABLE "ServiceListing" ADD COLUMN "aiSummary" TEXT,
ADD COLUMN "qualityLabel" TEXT,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
