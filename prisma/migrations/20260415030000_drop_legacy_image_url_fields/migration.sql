-- Drop legacy URL columns after backfill verification.
ALTER TABLE `Image`
  DROP COLUMN `url`,
  MODIFY COLUMN `uploadId` VARCHAR(191) NOT NULL;

ALTER TABLE `Vendor`
  DROP COLUMN `profileImageUrl`;
