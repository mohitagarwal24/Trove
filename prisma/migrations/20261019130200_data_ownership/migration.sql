ALTER TABLE "Quote" ADD COLUMN "reusedSources" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Quote" DROP CONSTRAINT "quote_usd_positive";
ALTER TABLE "Quote" ADD CONSTRAINT "quote_usd_positive" CHECK (currency = 'USD' AND "totalCents" >= 0 AND "commissionCents" >= 0 AND "commissionCents" <= "totalCents");
