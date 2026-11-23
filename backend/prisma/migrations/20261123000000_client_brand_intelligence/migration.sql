-- CreateEnum
CREATE TYPE "AiGenerationKind" AS ENUM ('BRAND_PROFILE', 'COPY', 'BRIEFING', 'CAMPAIGN_PLAN', 'LANDING_PAGE', 'COMPETITOR_ANALYSIS');

-- CreateTable
CREATE TABLE "ClientBrandProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "positioning" TEXT,
    "targetAudience" TEXT,
    "painsAndDesires" TEXT,
    "toneOfVoice" TEXT,
    "valueProposition" TEXT,
    "productsAndOffers" TEXT,
    "ctaGuidelines" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extraContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCompetitor" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "instagramHandle" TEXT,
    "tiktokHandle" TEXT,
    "youtubeHandle" TEXT,
    "notes" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCompetitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "userId" TEXT,
    "kind" "AiGenerationKind" NOT NULL,
    "model" TEXT NOT NULL,
    "title" TEXT,
    "prompt" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientBrandProfile_clientId_key" ON "ClientBrandProfile"("clientId");

-- CreateIndex
CREATE INDEX "ClientCompetitor_clientId_idx" ON "ClientCompetitor"("clientId");

-- CreateIndex
CREATE INDEX "AiGenerationLog_clientId_createdAt_idx" ON "AiGenerationLog"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGenerationLog_projectId_createdAt_idx" ON "AiGenerationLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGenerationLog_taskId_createdAt_idx" ON "AiGenerationLog"("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClientBrandProfile" ADD CONSTRAINT "ClientBrandProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCompetitor" ADD CONSTRAINT "ClientCompetitor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TaskProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Concede acesso ao Estúdio de IA para cargos existentes com perfil de gestão/conteúdo.
UPDATE "Role"
SET "permissions" = array_append("permissions", 'ai_studio.view')
WHERE ('clients.view' = ANY("permissions") OR 'tasks.view' = ANY("permissions"))
  AND NOT ('ai_studio.view' = ANY("permissions"));

UPDATE "Role"
SET "permissions" = array_append("permissions", 'ai_studio.manage')
WHERE ('clients.edit' = ANY("permissions") OR 'tasks.edit' = ANY("permissions"))
  AND NOT ('ai_studio.manage' = ANY("permissions"));
