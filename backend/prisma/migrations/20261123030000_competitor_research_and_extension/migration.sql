-- CreateEnum
CREATE TYPE "ReferencePlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'WEB', 'OTHER');

-- CreateEnum
CREATE TYPE "ResearchReportKind" AS ENUM ('COMPETITOR_AUDIT', 'VIRAL_TRENDS', 'COPY_MINING', 'WEBSITE_ANALYSIS');

-- CreateTable
CREATE TABLE "CompetitorReference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "competitorId" TEXT,
    "createdById" TEXT,
    "platform" "ReferencePlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "sourceUrl" TEXT,
    "authorHandle" TEXT,
    "title" TEXT,
    "caption" TEXT,
    "metrics" JSONB,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiAnalysis" TEXT,
    "extractedHooks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adaptedAngles" TEXT,
    "isViral" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdById" TEXT,
    "kind" "ResearchReportKind" NOT NULL,
    "topic" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rawMarkdown" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtensionApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtensionApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorReference_clientId_createdAt_idx" ON "CompetitorReference"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitorReference_competitorId_idx" ON "CompetitorReference"("competitorId");

-- CreateIndex
CREATE INDEX "ResearchReport_clientId_createdAt_idx" ON "ResearchReport"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchReport_projectId_createdAt_idx" ON "ResearchReport"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionApiToken_tokenHash_key" ON "ExtensionApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ExtensionApiToken_userId_revokedAt_idx" ON "ExtensionApiToken"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "CompetitorReference" ADD CONSTRAINT "CompetitorReference_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorReference" ADD CONSTRAINT "CompetitorReference_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "ClientCompetitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorReference" ADD CONSTRAINT "CompetitorReference_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TaskProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionApiToken" ADD CONSTRAINT "ExtensionApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
