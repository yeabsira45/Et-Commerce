import type { VerificationStatus } from "@prisma/client";

export function computeTrustScore(input: {
  phoneVerificationStatus: VerificationStatus;
  idVerificationStatus: VerificationStatus;
  addressVerificationStatus: VerificationStatus;
  accountCreatedAt?: Date;
  reviewCount?: number;
  averageRating?: number;
}) {
  let score = 0;
  if (input.phoneVerificationStatus === "VERIFIED") score += 30;
  if (input.idVerificationStatus === "VERIFIED") score += 40;
  if (input.addressVerificationStatus === "VERIFIED") score += 20;

  if (input.accountCreatedAt) {
    const ageDays = Math.max(0, Math.floor((Date.now() - input.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)));
    if (ageDays >= 90) score += 5;
    if (ageDays >= 365) score += 5;
  }

  if ((input.reviewCount || 0) >= 5) score += 5;
  if ((input.averageRating || 0) >= 4.5) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function trustBadges(input: {
  phoneVerificationStatus: VerificationStatus;
  idVerificationStatus: VerificationStatus;
  addressVerificationStatus: VerificationStatus;
}) {
  const badges: string[] = [];
  if (input.phoneVerificationStatus === "VERIFIED") badges.push("Phone verified");
  if (input.idVerificationStatus === "VERIFIED") badges.push("ID verified");
  if (input.addressVerificationStatus === "VERIFIED") badges.push("Address verified");
  return badges;
}
