-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "amcContractId" TEXT,
ADD COLUMN     "quotationType" TEXT NOT NULL DEFAULT 'SALES';

-- CreateTable
CREATE TABLE "amc_contracts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "annualValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sites" TEXT,
    "servicesCctv" BOOLEAN NOT NULL DEFAULT false,
    "servicesFire" BOOLEAN NOT NULL DEFAULT false,
    "servicesAlarm" BOOLEAN NOT NULL DEFAULT false,
    "servicesSprinkler" BOOLEAN NOT NULL DEFAULT false,
    "servicesPa" BOOLEAN NOT NULL DEFAULT false,
    "renewalReminderDays" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "quotationId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "amc_contracts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amc_contracts" ADD CONSTRAINT "amc_contracts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
