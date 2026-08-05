import { describe, expect, it } from "vitest";
import {
	buildResizeTransform,
	rotateFocalPoint,
} from "./build-resize-transform.js";

describe("Cloudflare Images transform helpers", () => {
	it.each([
		[0, { x: 0.2, y: 0.3 }],
		[90, { x: 0.7, y: 0.2 }],
		[180, { x: 0.8, y: 0.7 }],
		[270, { x: 0.3, y: 0.8 }],
	] as const)("rotates focal coordinates by %s degrees", (rotate, expected) => {
		expect(rotateFocalPoint({ x: 0.2, y: 0.3 }, rotate)).toEqual(expected);
	});

	it("uses height for outside when height has the larger scale", () => {
		expect(
			buildResizeTransform({
				options: { width: 400, height: 400, fit: "outside" },
				sourceWidth: 1000,
				sourceHeight: 500,
			}),
		).toEqual({ height: 400, fit: "contain" });
	});
});
