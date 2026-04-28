/**
 * Assigns a loyalty tier based on a member's point total.
 *
 * Tier thresholds come from ClientConfig so they can differ per merchant —
 * they are passed in as arguments rather than hardcoded here.
 *
 * @param {number} points     - The member's current point balance (must be >= 0)
 * @param {number} tierSilver - Minimum points required to reach Silver
 * @param {number} tierGold   - Minimum points required to reach Gold
 * @returns {"Bronze" | "Silver" | "Gold"} The tier the member belongs to
 */
export function assignTier(points, tierSilver, tierGold) {
  if (points < 0) {
    throw new Error("Points cannot be negative");
  }

  if (points >= tierGold) {
    return "Gold";
  }

  if (points >= tierSilver) {
    return "Silver";
  }

  return "Bronze";
}
