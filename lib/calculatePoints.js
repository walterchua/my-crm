/**
 * Calculates loyalty points earned from a purchase.
 *
 * @param {number} spendAmount - The amount the member spent (must be >= 0)
 * @param {number} earnRate - Points earned per dollar spent (must be >= 0)
 * @returns {number} Whole points earned, rounded down (no fractional points)
 */
export function calculatePoints(spendAmount, earnRate) {
  if (spendAmount < 0) {
    throw new Error("Amount cannot be negative");
  }

  if (earnRate < 0) {
    throw new Error("Earn rate cannot be negative");
  }

  return Math.floor(spendAmount * earnRate);
}
