-- Add seenAt support for chat read receipts
ALTER TABLE `Message`
  ADD COLUMN `seenAt` DATETIME(3) NULL;

-- Add feedback collection table
CREATE TABLE `Feedback` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `type` ENUM('BUG', 'FEATURE', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
  `message` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Feedback_type_createdAt_idx` ON `Feedback`(`type`, `createdAt`);
CREATE INDEX `Feedback_userId_createdAt_idx` ON `Feedback`(`userId`, `createdAt`);
CREATE INDEX `Message_conversationId_seenAt_idx` ON `Message`(`conversationId`, `seenAt`);

ALTER TABLE `Feedback`
  ADD CONSTRAINT `Feedback_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
