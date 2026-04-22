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
import { calculatePoints } from "../lib/calculatePoints.js";

describe("calculatePoints", () => {
  // ─── Happy path ───────────────────────────────────────────────────────────
  // These are the normal, expected uses of the function.

  it("returns the correct points for a standard 1x earn rate", () => {
    // Arrange
    const spendAmount = 100;
    const earnRate = 1;

    // Act
    const result = calculatePoints(spendAmount, earnRate);

    // Assert
    expect(result).toBe(100);
  });

  it("returns double the points when a 2x promotional earn rate is applied", () => {
    // Arrange
    const spendAmount = 50;
    const earnRate = 2;

    // Act
    const result = calculatePoints(spendAmount, earnRate);

    // Assert
    expect(result).toBe(100);
  });

  it("returns half the points when a 0.5x restricted earn rate is applied", () => {
    // Arrange
    const spendAmount = 80;
    const earnRate = 0.5;

    // Act
    const result = calculatePoints(spendAmount, earnRate);

    // Assert
    expect(result).toBe(40);
  });

  it("returns zero points when the spend amount is zero", () => {
    // Arrange
    const spendAmount = 0;
    const earnRate = 1;

    // Act
    const result = calculatePoints(spendAmount, earnRate);

    // Assert
    expect(result).toBe(0);
  });

  it("returns zero points when the earn rate is zero", () => {
    // Arrange — a zero earn rate is valid (e.g. excluded categories earn nothing)
    const spendAmount = 100;
    const earnRate = 0;

    // Act
    const result = calculatePoints(spendAmount, earnRate);

    // Assert
    expect(result).toBe(0);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────
  // These test boundary conditions where the function's behaviour may be
  // less obvious.

  it("rounds down fractional points so members never receive partial points", () => {
    // Arrange — $10 at 1.5x = 15 points exactly, but $7 at 1.5x = 10.5 → 10
    const spendAmount = 7;
    const earnRate = 1.5;

    // Act
    const result = calculatePoints(spendAmount, earnRate);

    // Assert
    expect(result).toBe(10);
  });

  // ─── Error cases ──────────────────────────────────────────────────────────
  // These test that the function throws the right error with the right message
  // when it receives invalid input.

  it("throws an error when the spend amount is negative", () => {
    // Arrange
    const spendAmount = -10;
    const earnRate = 1;

    // Act & Assert — we wrap the call in a function so vitest can catch the throw
    expect(() => calculatePoints(spendAmount, earnRate)).toThrow(
      "Amount cannot be negative"
    );
  });

  it("throws an error when the earn rate is negative", () => {
    // Arrange
    const spendAmount = 100;
    const earnRate = -1;

    // Act & Assert
    expect(() => calculatePoints(spendAmount, earnRate)).toThrow(
      "Earn rate cannot be negative"
    );
  });
});
