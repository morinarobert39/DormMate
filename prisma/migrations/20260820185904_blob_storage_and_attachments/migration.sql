-- AlterTable
ALTER TABLE "qr_codes" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "administrative_request_attachments" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "administrative_request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "administrative_request_attachments_requestId_idx" ON "administrative_request_attachments"("requestId");

-- AddForeignKey
ALTER TABLE "administrative_request_attachments" ADD CONSTRAINT "administrative_request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "administrative_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administrative_request_attachments" ADD CONSTRAINT "administrative_request_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
