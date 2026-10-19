ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleSubject" TEXT, ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
ALTER TABLE "Session" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'password', ADD COLUMN "authenticatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE TABLE "OAuthAttempt" (id TEXT PRIMARY KEY, "browserHash" TEXT NOT NULL, "nonceHash" TEXT NOT NULL, "encryptedVerifier" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "returnTo" TEXT NOT NULL, "linkUserId" TEXT);
