-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" TEXT,
ADD COLUMN     "currentStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "datasheetUrl" TEXT,
ADD COLUMN     "inputTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
ADD COLUMN     "outputTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
ADD COLUMN     "sacCode" TEXT,
ADD COLUMN     "trackSerial" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "serial_numbers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "orderId" TEXT,
    "contactId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "serial_numbers_companyId_serialNo_key" ON "serial_numbers"("companyId", "serialNo");

-- AddForeignKey
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
