-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinancialCategoryNature" AS ENUM ('REVENUE', 'DEDUCTION', 'DIRECT_COST', 'OPERATING_EXPENSE', 'FINANCIAL_RESULT');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'PAYMENT_GATEWAY', 'CASH');

-- CreateTable
CREATE TABLE "FinancialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nature" "FinancialCategoryNature" NOT NULL,
    "color" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCostCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "accountType" "FinancialAccountType" NOT NULL DEFAULT 'CHECKING',
    "initialBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "currentBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "pixKey" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "nominalAmountCents" INTEGER NOT NULL,
    "interestCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "paidAmountCents" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "competenceDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "categoryId" TEXT NOT NULL,
    "costCenterId" TEXT,
    "accountId" TEXT,
    "clientId" TEXT,
    "influencerId" TEXT,
    "supplierId" TEXT,
    "chargeId" TEXT,
    "attachmentUrl" TEXT,
    "invoiceNumber" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "approvedById" TEXT,
    "installmentIndex" INTEGER,
    "installmentTotal" INTEGER,
    "recurrenceGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialCategory_nature_idx" ON "FinancialCategory"("nature");

-- CreateIndex
CREATE INDEX "FinancialCategory_parentId_idx" ON "FinancialCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialCostCenter_code_key" ON "FinancialCostCenter"("code");

-- CreateIndex
CREATE INDEX "FinancialSupplier_name_idx" ON "FinancialSupplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEntry_chargeId_key" ON "FinancialEntry"("chargeId");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_status_idx" ON "FinancialEntry"("type", "status");

-- CreateIndex
CREATE INDEX "FinancialEntry_dueDate_idx" ON "FinancialEntry"("dueDate");

-- CreateIndex
CREATE INDEX "FinancialEntry_competenceDate_idx" ON "FinancialEntry"("competenceDate");

-- CreateIndex
CREATE INDEX "FinancialEntry_paidAt_idx" ON "FinancialEntry"("paidAt");

-- CreateIndex
CREATE INDEX "FinancialEntry_categoryId_idx" ON "FinancialEntry"("categoryId");

-- CreateIndex
CREATE INDEX "FinancialEntry_costCenterId_idx" ON "FinancialEntry"("costCenterId");

-- CreateIndex
CREATE INDEX "FinancialEntry_accountId_idx" ON "FinancialEntry"("accountId");

-- CreateIndex
CREATE INDEX "FinancialEntry_clientId_idx" ON "FinancialEntry"("clientId");

-- CreateIndex
CREATE INDEX "FinancialEntry_influencerId_idx" ON "FinancialEntry"("influencerId");

-- CreateIndex
CREATE INDEX "FinancialEntry_supplierId_idx" ON "FinancialEntry"("supplierId");

-- AddForeignKey
ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinancialCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "FinancialCostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "FinancialSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "ClientCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
