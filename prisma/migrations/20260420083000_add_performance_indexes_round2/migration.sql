-- CreateIndex
CREATE INDEX `Listing_status_moderationState_expiresAt_createdAt_idx`
ON `Listing`(`status`, `moderationState`, `expiresAt`, `createdAt`);

-- CreateIndex
CREATE INDEX `Listing_ownerId_createdAt_idx`
ON `Listing`(`ownerId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Listing_ownerId_category_title_createdAt_idx`
ON `Listing`(`ownerId`, `category`, `title`, `createdAt`);

-- CreateIndex
CREATE INDEX `Message_conversationId_senderId_readAt_idx`
ON `Message`(`conversationId`, `senderId`, `readAt`);

-- CreateIndex
CREATE INDEX `Report_createdAt_idx`
ON `Report`(`createdAt`);
