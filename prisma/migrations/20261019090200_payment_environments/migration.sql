-- Preserve historic records while allowing the real live payment environment.
-- Application routes only create sandbox/live purchases.
ALTER TABLE "Purchase" DROP CONSTRAINT "purchase_mode";
ALTER TABLE "Purchase" ADD CONSTRAINT "purchase_mode" CHECK (mode IN ('sandbox', 'live', 'simulation'));
