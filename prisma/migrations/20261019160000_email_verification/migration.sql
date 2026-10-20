CREATE TABLE "EmailVerification" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EmailVerification_expiresAt_idx" ON "EmailVerification"("expiresAt");
