import { expect, it } from "vitest";
import type { LngLat } from "../data/types";
import { insertAt, midpoints, moveAt, round5 } from "./edit";

const square: LngLat[] = [[0, 0], [2, 0], [2, 2], [0, 2]];

it("moves one corner and leaves the original ring alone", () => {
  expect(moveAt(square, 1, [3, 1])).toEqual([[0, 0], [3, 1], [2, 2], [0, 2]]);
  expect(square[1]).toEqual([2, 0]);
});

it("gives one midpoint per side, the last one closing the ring", () => {
  expect(midpoints(square)).toEqual([[1, 0], [2, 1], [1, 2], [0, 1]]);
});

it("pulling the midpoint of side i makes a new corner between corners i and i + 1", () => {
  // Side 3 runs from the last corner back to the first; its new corner goes at the end.
  expect(insertAt(square, 1, [1, -1])).toEqual([[0, 0], [1, -1], [2, 0], [2, 2], [0, 2]]);
  expect(insertAt(square, 4, [-1, 1])).toEqual([[0, 0], [2, 0], [2, 2], [0, 2], [-1, 1]]);
});

it("rounds to five decimals", () => {
  expect(round5([16.0612345678, 40.8623456789])).toEqual([16.06123, 40.86235]);
});
