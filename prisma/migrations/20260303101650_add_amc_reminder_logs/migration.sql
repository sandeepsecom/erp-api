-- CreateTable
CREATE TABLE "amc_reminder_logs" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "daysBeforeExpiry" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentToEmails" TEXT[],

    CONSTRAINT "amc_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amc_reminder_logs_contractId_daysBeforeExpiry_key" ON "amc_reminder_logs"("contractId", "daysBeforeExpiry");

-- AddForeignKey
ALTER TABLE "amc_reminder_logs" ADD CONSTRAINT "amc_reminder_logs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "amc_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
