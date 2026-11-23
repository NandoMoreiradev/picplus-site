-- CreateEnum
CREATE TYPE "CampaignPlanScope" AS ENUM ('MONTHLY', 'QUARTERLY', 'SALES_CAMPAIGN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CampaignPlanStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "CampaignPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" "CampaignPlanScope" NOT NULL,
    "status" "CampaignPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "objective" TEXT,
    "strategySummary" TEXT,
    "pillars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "clientId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "scheduledDate" TIMESTAMP(3),
    "channel" TEXT NOT NULL,
    "format" TEXT,
    "funnelStage" TEXT,
    "pillar" TEXT,
    "title" TEXT NOT NULL,
    "hook" TEXT,
    "briefing" TEXT,
    "copyDraft" TEXT,
    "cta" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignPlan_projectId_createdAt_idx" ON "CampaignPlan"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignPlan_clientId_createdAt_idx" ON "CampaignPlan"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignPlanItem_planId_order_idx" ON "CampaignPlanItem"("planId", "order");

-- CreateIndex
CREATE INDEX "CampaignPlanItem_taskId_idx" ON "CampaignPlanItem"("taskId");

-- AddForeignKey
ALTER TABLE "CampaignPlan" ADD CONSTRAINT "CampaignPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPlan" ADD CONSTRAINT "CampaignPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPlan" ADD CONSTRAINT "CampaignPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPlanItem" ADD CONSTRAINT "CampaignPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CampaignPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPlanItem" ADD CONSTRAINT "CampaignPlanItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
