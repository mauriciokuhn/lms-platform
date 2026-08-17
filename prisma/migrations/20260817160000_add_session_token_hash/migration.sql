-- AlterTable
ALTER TABLE "LoginHistory" ADD COLUMN "sessionTokenHash" TEXT;

-- AlterTable
ALTER TABLE "LoginHistory" ADD COLUMN "revokedAt" TIMESTAMP(3);
