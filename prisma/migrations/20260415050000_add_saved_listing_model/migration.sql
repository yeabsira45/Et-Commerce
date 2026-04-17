-- CreateTable
CREATE TABLE `SavedListing` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SavedListing_userId_listingId_key`(`userId`, `listingId`),
    INDEX `SavedListing_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill from notification-based saved listing records.
INSERT INTO `SavedListing` (`id`, `userId`, `listingId`, `createdAt`)
SELECT
  LOWER(REPLACE(UUID(), '-', '')) AS `id`,
  n.`receiverId` AS `userId`,
  JSON_UNQUOTE(JSON_EXTRACT(n.`data`, '$.listingId')) AS `listingId`,
  n.`createdAt`
FROM `Notification` n
JOIN `Listing` l ON l.`id` = JSON_UNQUOTE(JSON_EXTRACT(n.`data`, '$.listingId'))
WHERE n.`type` = 'LISTING'
  AND n.`receiverId` = n.`senderId`
  AND JSON_UNQUOTE(JSON_EXTRACT(n.`data`, '$.action')) = 'saved_listing_self'
  AND JSON_UNQUOTE(JSON_EXTRACT(n.`data`, '$.listingId')) IS NOT NULL
ON DUPLICATE KEY UPDATE `createdAt` = LEAST(`SavedListing`.`createdAt`, VALUES(`createdAt`));

-- AddForeignKey
ALTER TABLE `SavedListing` ADD CONSTRAINT `SavedListing_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedListing` ADD CONSTRAINT `SavedListing_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `Listing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
