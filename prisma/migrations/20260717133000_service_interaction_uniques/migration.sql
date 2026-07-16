-- Keep one active interaction of each type per user/listing pair.
DELETE FROM "ServiceClaim"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "listingId", "userId"
        ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
      ) AS row_number
    FROM "ServiceClaim"
  ) duplicates
  WHERE duplicates.row_number > 1
);

DELETE FROM "ServiceRecommendation"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "listingId", "userId"
        ORDER BY "createdAt" DESC, "id" DESC
      ) AS row_number
    FROM "ServiceRecommendation"
  ) duplicates
  WHERE duplicates.row_number > 1
);

DELETE FROM "ServiceReport"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "listingId", "userId"
        ORDER BY "createdAt" DESC, "id" DESC
      ) AS row_number
    FROM "ServiceReport"
  ) duplicates
  WHERE duplicates.row_number > 1
);

CREATE UNIQUE INDEX "ServiceClaim_listingId_userId_key" ON "ServiceClaim"("listingId", "userId");
CREATE UNIQUE INDEX "ServiceRecommendation_listingId_userId_key" ON "ServiceRecommendation"("listingId", "userId");
CREATE UNIQUE INDEX "ServiceReport_listingId_userId_key" ON "ServiceReport"("listingId", "userId");
