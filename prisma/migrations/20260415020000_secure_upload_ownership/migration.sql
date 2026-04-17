-- CreateTable
CREATE TABLE `Upload` (
    `id` VARCHAR(191) NOT NULL,
    `ownerUserId` VARCHAR(191) NOT NULL,
    `ownerVendorId` VARCHAR(191) NULL,
    `path` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `linkedEntityType` VARCHAR(191) NULL,
    `linkedEntityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Upload_ownerUserId_idx`(`ownerUserId`),
    INDEX `Upload_ownerVendorId_idx`(`ownerVendorId`),
    INDEX `Upload_linkedEntityType_linkedEntityId_idx`(`linkedEntityType`, `linkedEntityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Vendor`
    ADD COLUMN `profileImageUploadId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Image`
    ADD COLUMN `uploadId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Upload` ADD CONSTRAINT `Upload_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Upload` ADD CONSTRAINT `Upload_ownerVendorId_fkey` FOREIGN KEY (`ownerVendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_profileImageUploadId_fkey` FOREIGN KEY (`profileImageUploadId`) REFERENCES `Upload`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Image` ADD CONSTRAINT `Image_uploadId_fkey` FOREIGN KEY (`uploadId`) REFERENCES `Upload`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
