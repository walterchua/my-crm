/**
 * Determines whether a member is eligible to redeem a reward.
 *
 * @param {number} memberPoints - The member's current point balance (must be >= 0)
 * @param {number} requiredPoints - Points needed to redeem the reward
 * @param {Date|null} expiryDate - When the member's points expire, or null if they never expire
 * @returns {boolean} true if the member can redeem, false otherwise
 */
export function canRedeem(memberPoints, requiredPoints, expiryDate) {
  if (memberPoints < 0) {
    throw new Error("Points cannot be negative");
  }

  if (memberPoints < requiredPoints) {
    return false;
  }

  // null means no expiry — points never expire
  if (expiryDate !== null && expiryDate < new Date()) {
    return false;
  }

  return true;
}
