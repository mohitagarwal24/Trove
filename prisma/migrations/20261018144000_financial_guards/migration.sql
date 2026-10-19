-- Financial invariants apply even if two application workers race.
ALTER TABLE "TaskRun" ADD CONSTRAINT "task_budget_nonnegative" CHECK ("budgetCents" >= 0 AND "spentCents" >= 0 AND "reservedCents" >= 0);
ALTER TABLE "TaskRun" ADD CONSTRAINT "task_budget_not_exceeded" CHECK ("spentCents" + "reservedCents" <= "budgetCents");
ALTER TABLE "Quote" ADD CONSTRAINT "quote_usd_positive" CHECK (currency = 'USD' AND "totalCents" > 0 AND "commissionCents" >= 0 AND "commissionCents" <= "totalCents");
ALTER TABLE "QuoteLine" ADD CONSTRAINT "quote_line_amounts" CHECK (quantity > 0 AND "priceCents" > 0 AND "sellerCents" >= 0 AND "sellerCents" <= "priceCents");
ALTER TABLE "BudgetReservation" ADD CONSTRAINT "reservation_positive" CHECK ("amountCents" > 0);
ALTER TABLE "SellerPayable" ADD CONSTRAINT "payable_nonnegative" CHECK ("amountCents" >= 0);
ALTER TABLE "Purchase" ADD CONSTRAINT "purchase_mode" CHECK (mode IN ('sandbox', 'simulation'));
CREATE UNIQUE INDEX "one_current_version_per_offer" ON "OfferVersion" ("offerId") WHERE current = true;
