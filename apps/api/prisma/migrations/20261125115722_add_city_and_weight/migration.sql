/*
  Warnings:

  - Added the required column `city` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weightKg` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "city" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "weightKg" DECIMAL(10,3) NOT NULL;
