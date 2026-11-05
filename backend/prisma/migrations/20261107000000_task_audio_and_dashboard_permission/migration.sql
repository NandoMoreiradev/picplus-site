-- AlterTable
ALTER TABLE "TaskComment" ADD COLUMN "audioUrl" TEXT,
ADD COLUMN "audioMime" TEXT,
ADD COLUMN "audioDuration" INTEGER;

-- Nova permissão "dashboard.view" (página inicial): quem já tem cargo mantém o acesso de hoje.
UPDATE "Role"
SET "permissions" = array_append("permissions", 'dashboard.view')
WHERE NOT ('dashboard.view' = ANY("permissions"));
