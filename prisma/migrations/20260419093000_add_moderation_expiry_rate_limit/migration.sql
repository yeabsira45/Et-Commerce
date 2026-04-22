-- AlterTable
ALTER TABLE `Listing`
    ADD COLUMN `moderationState` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN `moderationReason` VARCHAR(191) NULL,
    ADD COLUMN `moderatedAt` DATETIME(3) NULL,
    ADD COLUMN `moderatedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `RateLimitBucket` (
    `key` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,
    `windowStart` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Listing_moderationState_status_createdAt_idx` ON `Listing`(`moderationState`, `status`, `createdAt`);

-- CreateIndex
CREATE INDEX `Listing_expiresAt_status_idx` ON `Listing`(`expiresAt`, `status`);
