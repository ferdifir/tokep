ALTER TABLE "ServiceReport"
ADD COLUMN "adminNote" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "ServiceReport_reviewedAt_createdAt_idx" ON "ServiceReport"("reviewedAt", "createdAt");
