-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('PROSPECT', 'ONBOARDING', 'ACTIVE', 'PAUSED', 'CHURNED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('RETAINER_FEE', 'FIXED_SCOPE', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "ChargeBillingType" AS ENUM ('BOLETO', 'PIX', 'CREDIT_CARD', 'UNDEFINED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'CANCELED');

-- AlterTable
ALTER TABLE "TaskProject" ADD COLUMN "clientId" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "corporateName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpjCpf" TEXT NOT NULL,
    "stateRegistration" TEXT,
    "segment" TEXT,
    "website" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "postalCode" TEXT,
    "address" TEXT,
    "addressNumber" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "contractType" "ContractType" NOT NULL DEFAULT 'RETAINER_FEE',
    "monthlyFeeCents" INTEGER DEFAULT 0,
    "dueDay" INTEGER DEFAULT 10,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "asaasCustomerId" TEXT,
    "accountManagerId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientContact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "isFinancial" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCharge" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "billingType" "ChargeBillingType" NOT NULL DEFAULT 'UNDEFINED',
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "asaasPaymentId" TEXT,
    "invoiceUrl" TEXT,
    "bankSlipUrl" TEXT,
    "pixQrCodeUrl" TEXT,
    "pixPayload" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_cnpjCpf_key" ON "Client"("cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "Client_asaasCustomerId_key" ON "Client"("asaasCustomerId");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_accountManagerId_idx" ON "Client"("accountManagerId");

-- CreateIndex
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

-- CreateIndex
CREATE INDEX "ClientContact_clientId_idx" ON "ClientContact"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCharge_asaasPaymentId_key" ON "ClientCharge"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "ClientCharge_clientId_status_idx" ON "ClientCharge"("clientId", "status");

-- CreateIndex
CREATE INDEX "ClientCharge_dueDate_idx" ON "ClientCharge"("dueDate");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_idx" ON "ClientNote"("clientId");

-- CreateIndex
CREATE INDEX "TaskProject_clientId_idx" ON "TaskProject"("clientId");

-- AddForeignKey
ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCharge" ADD CONSTRAINT "ClientCharge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

