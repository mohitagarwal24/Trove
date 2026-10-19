ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "Seller" DROP COLUMN "synthetic", ADD COLUMN "payoutEmail" TEXT;
CREATE TABLE "DatasetSnapshot" (
 "id" TEXT PRIMARY KEY, "sellerId" TEXT NOT NULL REFERENCES "Seller"("id"),
 "sourceKey" TEXT NOT NULL, "sourceUrl" TEXT NOT NULL, "licenseUrl" TEXT NOT NULL,
 "attribution" TEXT NOT NULL, "retrievedAt" TIMESTAMP(3) NOT NULL,
 "sourceUpdatedAt" TIMESTAMP(3) NOT NULL, "contentHash" TEXT NOT NULL,
 "rowCount" INTEGER NOT NULL CHECK ("rowCount" > 0), "encryptedData" TEXT NOT NULL
);
CREATE UNIQUE INDEX "DatasetSnapshot_sellerId_sourceKey_contentHash_key" ON "DatasetSnapshot"("sellerId","sourceKey","contentHash");
CREATE INDEX "DatasetSnapshot_sourceKey_retrievedAt_idx" ON "DatasetSnapshot"("sourceKey","retrievedAt");
ALTER TABLE "OfferVersion" ADD COLUMN "datasetId" TEXT REFERENCES "DatasetSnapshot"("id"), ADD COLUMN "sourceUrl" TEXT, ADD COLUMN "sourceLicenseUrl" TEXT, ADD COLUMN "sourceAttribution" TEXT, ADD COLUMN "retrievedAt" TIMESTAMP(3);
CREATE TABLE "RateLimit" ("key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 0, "resetAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "PasswordReset" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3));
CREATE INDEX "PasswordReset_userId_idx" ON "PasswordReset"("userId");
-- Retire public shared credentials without deleting purchase history or receipts.
UPDATE "User" SET "disabledAt" = NOW() WHERE email IN ('buyer@trove.test','researcher@trove.test','pricing@trove.test','suppliers@trove.test','market@trove.test');
DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE "disabledAt" IS NOT NULL);
UPDATE "AgentToken" SET "revokedAt" = NOW() WHERE "userId" IN (SELECT id FROM "User" WHERE "disabledAt" IS NOT NULL);
UPDATE "OfferVersion" SET current = false, available = false WHERE "datasetId" IS NULL;
