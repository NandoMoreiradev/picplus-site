-- CreateEnum
CREATE TYPE "WhatsappConversationStatus" AS ENUM ('BOT_HANDLING', 'OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "WhatsappMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsappMessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'STICKER', 'TEMPLATE', 'INTERACTIVE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "WhatsappChannel" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL DEFAULT 'picplus_secret_verify_token',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "qualityRating" TEXT DEFAULT 'GREEN',
    "aboutText" TEXT,
    "profilePhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappContact" (
    "id" TEXT NOT NULL,
    "waId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "profileName" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "contactRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappConversation" (
    "id" TEXT NOT NULL,
    "status" "WhatsappConversationStatus" NOT NULL DEFAULT 'BOT_HANDLING',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "resolutionReason" TEXT,
    "contactId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "wamid" TEXT,
    "direction" "WhatsappMessageDirection" NOT NULL,
    "type" "WhatsappMessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "status" "WhatsappMessageStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "mediaUrl" TEXT,
    "mimeType" TEXT,
    "fileName" TEXT,
    "conversationId" TEXT NOT NULL,
    "sentByUserId" TEXT,
    "replyToMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappConversationNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatbotConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "personaName" TEXT NOT NULL DEFAULT 'Cloe',
    "systemPrompt" TEXT NOT NULL,
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    "geminiApiKey" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "autoHandoff" BOOLEAN NOT NULL DEFAULT true,
    "autoHandoffKeywords" TEXT[] DEFAULT ARRAY['atendente', 'humano', 'atendimento', 'pessoa', 'falar com']::TEXT[],
    "maxMessagesBeforeHandoff" INTEGER NOT NULL DEFAULT 15,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatbotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappChannel_phoneNumberId_key" ON "WhatsappChannel"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappContact_waId_key" ON "WhatsappContact"("waId");

-- CreateIndex
CREATE INDEX "WhatsappContact_waId_idx" ON "WhatsappContact"("waId");

-- CreateIndex
CREATE INDEX "WhatsappContact_clientId_idx" ON "WhatsappContact"("clientId");

-- CreateIndex
CREATE INDEX "WhatsappContact_contactRequestId_idx" ON "WhatsappContact"("contactRequestId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_status_idx" ON "WhatsappConversation"("status");

-- CreateIndex
CREATE INDEX "WhatsappConversation_contactId_idx" ON "WhatsappConversation"("contactId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_assignedUserId_idx" ON "WhatsappConversation"("assignedUserId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_lastMessageAt_idx" ON "WhatsappConversation"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappMessage_wamid_key" ON "WhatsappMessage"("wamid");

-- CreateIndex
CREATE INDEX "WhatsappMessage_conversationId_idx" ON "WhatsappMessage"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_conversationId_sentAt_idx" ON "WhatsappMessage"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsappMessage_wamid_idx" ON "WhatsappMessage"("wamid");

-- CreateIndex
CREATE INDEX "WhatsappConversationNote_conversationId_idx" ON "WhatsappConversationNote"("conversationId");

-- AddForeignKey
ALTER TABLE "WhatsappContact" ADD CONSTRAINT "WhatsappContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappContact" ADD CONSTRAINT "WhatsappContact_contactRequestId_fkey" FOREIGN KEY ("contactRequestId") REFERENCES "ContactRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsappContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "WhatsappMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversationNote" ADD CONSTRAINT "WhatsappConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversationNote" ADD CONSTRAINT "WhatsappConversationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

