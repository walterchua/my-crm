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
import { canRedeem } from "../lib/canRedeem.js";

describe("canRedeem", () => {
  // ─── Happy path ───────────────────────────────────────────────────────────
  // These are the normal, expected uses of the function.

  it("returns true when the member has more points than required", () => {
    // Arrange
    const memberPoints = 500;
    const requiredPoints = 200;
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Act
    const result = canRedeem(memberPoints, requiredPoints, expiryDate);

    // Assert
    expect(result).toBe(true);
  });

  it("returns true when the member has exactly the required number of points (boundary)", () => {
    // Arrange — exact balance is the boundary condition: should qualify, not fail
    const memberPoints = 200;
    const requiredPoints = 200;
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Act
    const result = canRedeem(memberPoints, requiredPoints, expiryDate);

    // Assert
    expect(result).toBe(true);
  });

  it("returns true when points have no expiry date set", () => {
    // Arrange — null means the loyalty programme never expires these points
    const memberPoints = 300;
    const requiredPoints = 100;
    const expiryDate = null;

    // Act
    const result = canRedeem(memberPoints, requiredPoints, expiryDate);

    // Assert
    expect(result).toBe(true);
  });

  it("returns true when the expiry date is in the future", () => {
    // Arrange
    const memberPoints = 300;
    const requiredPoints = 100;
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Act
    const result = canRedeem(memberPoints, requiredPoints, expiryDate);

    // Assert
    expect(result).toBe(true);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────
  // These test boundary conditions where the function's behaviour matters most.

  it("returns false when the member does not have enough points", () => {
    // Arrange
    const memberPoints = 50;
    const requiredPoints = 200;
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Act
    const result = canRedeem(memberPoints, requiredPoints, expiryDate);

    // Assert
    expect(result).toBe(false);
  });

  it("returns false when the points have already expired", () => {
    // Arrange — expiry is set one day in the past
    const memberPoints = 500;
    const requiredPoints = 200;
    const expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

    // Act
    const result = canRedeem(memberPoints, requiredPoints, expiryDate);

    // Assert
    expect(result).toBe(false);
  });

  // ─── Error cases ──────────────────────────────────────────────────────────
  // These test that the function throws the right error with the right message
  // when it receives invalid input.

  it("throws an error when the member points balance is negative", () => {
    // Arrange
    const memberPoints = -100;
    const requiredPoints = 200;
    const expiryDate = null;

    // Act & Assert — we wrap the call in a function so vitest can catch the throw
    expect(() => canRedeem(memberPoints, requiredPoints, expiryDate)).toThrow(
      "Points cannot be negative"
    );
  });
});
