-- AlterTable
ALTER TABLE "ClientCharge" ADD COLUMN "nfeId" TEXT,
ADD COLUMN "nfeStatus" TEXT,
ADD COLUMN "nfeNumber" TEXT,
ADD COLUMN "nfePdfUrl" TEXT,
ADD COLUMN "nfeXmlUrl" TEXT,
ADD COLUMN "asaasSubscriptionId" TEXT,
ADD COLUMN "installmentCount" INTEGER,
ADD COLUMN "installmentNumber" INTEGER;
