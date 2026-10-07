-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "role" TEXT,
    "company" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "photo" TEXT,
    "orientation" TEXT NOT NULL DEFAULT 'vertical',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

