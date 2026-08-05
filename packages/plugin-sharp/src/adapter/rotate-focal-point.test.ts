import { describe, expect, it } from "vitest";
import rotateFocalPoint from "./rotate-focal-point.js";

describe("rotateFocalPoint", () => {
	it.each([
		[0, { x: 0.2, y: 0.3 }],
		[90, { x: 0.7, y: 0.2 }],
		[180, { x: 0.8, y: 0.7 }],
		[270, { x: 0.3, y: 0.8 }],
	] as const)("rotates focal coordinates by %s degrees", (rotate, expected) => {
		expect(rotateFocalPoint({ x: 0.2, y: 0.3 }, rotate)).toEqual(expected);
	});
});
