-- Older sessions have no recorded authentication time. Adding the column must
-- not make those sessions qualify as a fresh authentication for identity linking.
-- Normal signed-in access remains valid; linking requires signing in again.
UPDATE "Session" SET "authenticatedAt" = TIMESTAMP '1970-01-01 00:00:00' WHERE "authProvider" = 'password';
