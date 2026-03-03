-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "emailFromAddress" TEXT,
ADD COLUMN     "emailFromName" TEXT,
ADD COLUMN     "internalEmailCC" TEXT[],
ADD COLUMN     "sendgridApiKey" TEXT;
