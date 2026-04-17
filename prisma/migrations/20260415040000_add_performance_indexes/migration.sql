-- Listing indexes
CREATE INDEX `Listing_status_createdAt_idx` ON `Listing`(`status`, `createdAt`);
CREATE INDEX `Listing_vendorId_createdAt_idx` ON `Listing`(`vendorId`, `createdAt`);
CREATE INDEX `Listing_category_subcategory_idx` ON `Listing`(`category`, `subcategory`);

-- Conversation indexes
CREATE INDEX `Conversation_requesterId_updatedAt_idx` ON `Conversation`(`requesterId`, `updatedAt`);
CREATE INDEX `Conversation_ownerId_updatedAt_idx` ON `Conversation`(`ownerId`, `updatedAt`);

-- Message indexes
CREATE INDEX `Message_conversationId_createdAt_idx` ON `Message`(`conversationId`, `createdAt`);
CREATE INDEX `Message_conversationId_readAt_idx` ON `Message`(`conversationId`, `readAt`);

-- Notification indexes
CREATE INDEX `Notification_receiverId_readAt_type_createdAt_idx` ON `Notification`(`receiverId`, `readAt`, `type`, `createdAt`);

-- Review indexes
CREATE INDEX `Review_vendorId_createdAt_idx` ON `Review`(`vendorId`, `createdAt`);

-- Session indexes
CREATE INDEX `Session_userId_expiresAt_idx` ON `Session`(`userId`, `expiresAt`);
