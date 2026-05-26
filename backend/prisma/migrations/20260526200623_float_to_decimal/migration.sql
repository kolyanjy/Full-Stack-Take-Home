/*
  Warnings:

  - You are about to alter the column `total_value` on the `ingest_batches` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `value` on the `measurements` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `emission_limit` on the `sites` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.
  - You are about to alter the column `total_emissions_to_date` on the `sites` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,6)`.

*/
-- AlterTable
ALTER TABLE "ingest_batches" ALTER COLUMN "total_value" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "measurements" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,6);

-- AlterTable
ALTER TABLE "sites" ALTER COLUMN "emission_limit" SET DATA TYPE DECIMAL(18,6),
ALTER COLUMN "total_emissions_to_date" SET DATA TYPE DECIMAL(18,6);
