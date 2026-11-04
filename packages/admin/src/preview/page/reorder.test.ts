import { describe, expect, test } from "vitest";
import { reorderOffsets } from "./reorder.js";

const column = [
	{ x: 0, y: 0, width: 100, height: 100 },
	{ x: 0, y: 120, width: 100, height: 300 },
	{ x: 0, y: 440, width: 100, height: 50 },
];

describe("reorder offsets", () => {
	test("make room in a column of different heights, keeping the gaps", () => {
		//* the first moves to the end: the others move up by its height and gap
		expect(reorderOffsets(column, 0, 2)).toEqual([
			{ x: 0, y: 390 },
			{ x: 0, y: -120 },
			{ x: 0, y: -120 },
		]);
		//* the last moves to the start: the others move down by its height and gap
		expect(reorderOffsets(column, 2, 0)).toEqual([
			{ x: 0, y: 70 },
			{ x: 0, y: 70 },
			{ x: 0, y: -440 },
		]);
	});

	test("move along a row", () => {
		const row = [
			{ x: 0, y: 0, width: 200, height: 80 },
			{ x: 220, y: 0, width: 200, height: 80 },
		];
		expect(reorderOffsets(row, 0, 1)).toEqual([
			{ x: 220, y: 0 },
			{ x: -220, y: 0 },
		]);
	});

	test("swap places in a wrapping grid", () => {
		const grid = [
			{ x: 0, y: 0, width: 100, height: 100 },
			{ x: 120, y: 0, width: 100, height: 100 },
			{ x: 0, y: 120, width: 100, height: 100 },
		];
		expect(reorderOffsets(grid, 0, 2)).toEqual([
			{ x: 0, y: 120 },
			{ x: -120, y: 0 },
			{ x: 120, y: -120 },
		]);
	});

	test("leave everything where it is when nothing moves", () => {
		expect(reorderOffsets(column, 1, 1)).toEqual(
			column.map(() => ({ x: 0, y: 0 })),
		);
	});
});
