/**
 * Arrange-Act-Assert (AAA) pattern
 * ─────────────────────────────────
 * Every test in this file is structured in three steps:
 *
 *   Arrange — set up the inputs and any variables needed for the test
 *   Act     — call the function being tested
 *   Assert  — check that the result matches what we expect
 *
 * Keeping these three steps explicit makes tests easy to read and
 * easy to debug when something goes wrong.
 */

import { describe, it, expect } from "vitest";
import { assignTier } from "../lib/assignTier.js";

describe("assignTier", () => {
  // ─── Happy path ───────────────────────────────────────────────────────────
  // These are the normal, expected uses of the function — a member clearly
  // sitting inside one of the three tier bands.

  it("returns Bronze when the member's points are below the Silver threshold", () => {
    // Arrange
    const points = 99;
    const tierSilver = 100;
    const tierGold = 500;

    // Act
    const result = assignTier(points, tierSilver, tierGold);

    // Assert
    expect(result).toBe("Bronze");
  });

  it("returns Silver when the member's points are between the Silver and Gold thresholds", () => {
    // Arrange
    const points = 300;
    const tierSilver = 100;
    const tierGold = 500;

    // Act
    const result = assignTier(points, tierSilver, tierGold);

    // Assert
    expect(result).toBe("Silver");
  });

  it("returns Gold when the member's points are well above the Gold threshold", () => {
    // Arrange
    const points = 1000;
    const tierSilver = 100;
    const tierGold = 500;

    // Act
    const result = assignTier(points, tierSilver, tierGold);

    // Assert
    expect(result).toBe("Gold");
  });

  // ─── Boundary cases ───────────────────────────────────────────────────────
  // Boundary tests check the exact cutoff values — the minimum points needed
  // to enter each tier.  These matter because an off-by-one mistake (using >
  // instead of >=) would silently misclassify a member who is sitting right on
  // the threshold.  A member at exactly 100 points should be Silver, not Bronze;
  // a member at exactly 500 points should be Gold, not Silver.  Without these
  // tests, that kind of bug can go undetected until a real member complains.

  it("returns Silver when the member's points are exactly at the Silver threshold boundary", () => {
    // Arrange — this is the lowest score that earns Silver
    const points = 100;
    const tierSilver = 100;
    const tierGold = 500;

    // Act
    const result = assignTier(points, tierSilver, tierGold);

    // Assert
    expect(result).toBe("Silver");
  });

  it("returns Gold when the member's points are exactly at the Gold threshold boundary", () => {
    // Arrange — this is the lowest score that earns Gold
    const points = 500;
    const tierSilver = 100;
    const tierGold = 500;

    // Act
    const result = assignTier(points, tierSilver, tierGold);

    // Assert
    expect(result).toBe("Gold");
  });

  // ─── Error cases ──────────────────────────────────────────────────────────
  // These test that the function throws the right error with the right message
  // when it receives invalid input.

  it("throws an error when the member's point balance is negative", () => {
    // Arrange
    const points = -1;
    const tierSilver = 100;
    const tierGold = 500;

    // Act & Assert — we wrap the call in a function so vitest can catch the throw
    expect(() => assignTier(points, tierSilver, tierGold)).toThrow(
      "Points cannot be negative"
    );
  });
});
