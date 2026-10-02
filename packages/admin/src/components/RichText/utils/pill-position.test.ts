import { describe, expect, it } from "vitest";
import { getPillPosition } from "./pill-position";

const pill = { width: 200, height: 36 };
const viewport = { width: 1000, height: 800 };

describe("getPillPosition", () => {
	it("centres the pill above the selection", () => {
		expect(
			getPillPosition(
				{ top: 300, left: 400, bottom: 320, width: 100 },
				pill,
				viewport,
			),
		).toEqual({ top: 254, left: 350 });
	});

	it("drops below a selection near the top and stays inside the viewport", () => {
		expect(
			getPillPosition(
				{ top: 20, left: 960, bottom: 40, width: 30 },
				pill,
				viewport,
			),
		).toEqual({ top: 50, left: 792 });
	});
});
