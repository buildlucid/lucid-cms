import { describe, expect, test } from "vitest";
import {
	distanceTo,
	HANDLE_SIZE,
	outlineRect,
	placeHandle,
	placeItemHandle,
} from "./preview-handles";

const view = { width: 1000, inset: 0 };

describe("preview handles", () => {
	test("sit above an element's top left, or inside it when there's no room above", () => {
		const brick = { x: 0, y: 300, width: 1000, height: 400 };
		expect(placeHandle(brick, view)).toEqual({
			x: 4,
			y: 300 - 32 - 6,
		});
		//* scrolled past, it stays below a 64px header while the brick is in view
		expect(
			placeHandle(
				{ ...brick, y: -100 },
				{
					...view,
					inset: 64,
				},
			),
		).toEqual({ x: 4, y: 68 });
		expect(placeHandle({ ...brick, y: -380 }, view).y).toBe(-12);
	});

	test("move an item's handle to its top right when it would cover its brick's", () => {
		const brickHandle = placeHandle(
			{ x: 40, y: 100, width: 900, height: 500 },
			view,
		);
		const item = { x: 40, y: 104, width: 300, height: 200 };
		expect(placeItemHandle(item, view, brickHandle)).toEqual({
			x: 40 + 300 - HANDLE_SIZE.width,
			y: 104 - HANDLE_SIZE.height - 6,
		});
		expect(placeItemHandle({ ...item, y: 300 }, view, brickHandle).x).toBe(40);
	});

	test("outline 4px out at the preview's zoom, inside its sides", () => {
		expect(
			outlineRect({ x: 0, y: 100, width: 1000, height: 200 }, 0.5, 500),
		).toEqual({ x: 1.5, y: 48, width: 497, height: 104 });
		expect(
			outlineRect({ x: 100, y: 100, width: 200, height: 200 }, 1, 1000),
		).toEqual({ x: 96, y: 96, width: 208, height: 208 });
	});

	test("measure how far a point is from a rect", () => {
		const rect = { x: 10, y: 10, width: 10, height: 10 };
		expect(distanceTo(rect, { x: 15, y: 15 })).toBe(0);
		expect(distanceTo(rect, { x: 23, y: 24 })).toBe(5);
	});
});
