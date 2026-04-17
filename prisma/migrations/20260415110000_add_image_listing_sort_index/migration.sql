-- Add index to speed up listing image fetch ordering.
CREATE INDEX `Image_listingId_sortOrder_idx` ON `Image`(`listingId`, `sortOrder`);
