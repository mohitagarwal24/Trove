-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "approvalBasis" TEXT NOT NULL DEFAULT 'review_required',
ADD COLUMN     "disputeId" TEXT;

-- Preserve refund obligations accepted before manual case review was introduced.
-- New refunds default to review_required and cannot reach the processor.
UPDATE "Refund" SET "approvalBasis" = 'legacy_authorized';

-- CreateTable
CREATE TABLE "PurchaseDispute" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "evidence" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'open',
    "reviewedBy" TEXT,
    "decisionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidenceUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDispute_purchaseId_key" ON "PurchaseDispute"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseDispute_state_createdAt_idx" ON "PurchaseDispute"("state", "createdAt");

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_createdAt_idx" ON "DisputeMessage"("disputeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_disputeId_key" ON "Refund"("disputeId");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "PurchaseDispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDispute" ADD CONSTRAINT "PurchaseDispute_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "PurchaseDispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
