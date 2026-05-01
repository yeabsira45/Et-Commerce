-- AlterTable
ALTER TABLE `Vendor`
    ADD COLUMN `phoneVerificationStatus` ENUM('NONE', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `idVerificationStatus` ENUM('NONE', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `addressVerificationStatus` ENUM('NONE', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `trustScore` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `verificationSubmittedAt` DATETIME(3) NULL,
    ADD COLUMN `verificationReviewedAt` DATETIME(3) NULL,
    ADD COLUMN `verificationNotes` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `SavedSearch` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `query` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastNotifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SavedSearch_userId_isActive_updatedAt_idx`(`userId`, `isActive`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FraudSignal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `severity` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(191) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FraudSignal_userId_type_createdAt_idx`(`userId`, `type`, `createdAt`),
    INDEX `FraudSignal_severity_createdAt_idx`(`severity`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `page` VARCHAR(191) NULL,
    `referrer` VARCHAR(191) NULL,
    `data` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_eventName_createdAt_idx`(`eventName`, `createdAt`),
    INDEX `AnalyticsEvent_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SavedSearch` ADD CONSTRAINT `SavedSearch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FraudSignal` ADD CONSTRAINT `FraudSignal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
