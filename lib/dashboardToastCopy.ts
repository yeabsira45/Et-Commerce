/**
 * Consistent dashboard toast copy: successes use “Successfully …”, permissions “You cannot …”, failures “Could not …”.
 */
export const dashboardToast = {
  // Profile
  profileSaved: "Successfully saved vendor profile.",
  profileSavedWithImage: "Successfully saved vendor profile (image stored locally).",
  profileSaveFailed: "Could not save profile. Please try again.",
  profileImageRemoved: "Successfully removed profile image.",

  // Listings (vendor)
  listingsLoadFailed: "Could not load your listings.",
  listingUpdated: "Successfully updated listing.",
  listingDeleted: "Successfully deleted listing.",
  listingDeleteFailed: "Could not delete listing.",
  listingUpdateFailed: "Could not update listing.",
  listingNoPermission: "You cannot modify this listing.",
  listingImageDemo: "Image updated (demo only).",
  imageReadFailed: "Could not read image file.",

  // Settings
  accountSaved: "Successfully saved account details.",
  accountSaveFailed: "Could not save account details.",
  passwordDemoNote: "Password change noted (demo only — not saved to the server).",
  passwordsMismatch: "Passwords do not match.",
  accountDeleteBlocked: "You cannot delete this account.",
  accountDemoDeleteBlocked: "Cannot delete demo admin account.",
  accountDeletedMock: "Successfully removed account (mock). You have been signed out.",

  // Admin
  adminLoadFailed: "Could not load admin data.",
  adminBanBlocked: "Cannot ban the demo admin account.",
  userBanned: "Successfully banned user.",
  userUnbanned: "Successfully unbanned user.",
  adminBanFailed: "Could not update ban status.",
  userDeleted: "Successfully deleted user.",
  userDeleteFailed: "Could not delete user.",
  userUpdated: "Successfully updated user.",
  userUpdateFailed: "Could not update user.",
  userEditBlocked: "You cannot edit this user.",
} as const;
