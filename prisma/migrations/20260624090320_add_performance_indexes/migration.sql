-- CreateIndex
CREATE INDEX "Member_clientId_idx" ON "Member"("clientId");

-- CreateIndex
CREATE INDEX "Transaction_memberId_idx" ON "Transaction"("memberId");

-- CreateIndex
CREATE INDEX "Transaction_clientId_idx" ON "Transaction"("clientId");

-- CreateIndex
CREATE INDEX "Voucher_memberId_idx" ON "Voucher"("memberId");

-- CreateIndex
CREATE INDEX "Voucher_clientId_idx" ON "Voucher"("clientId");
