import { describe, expect, it } from "vitest";
import { LucidError } from "../errors/index.js";
import {
	generateKeyBetween,
	isFractionalOrderKey,
} from "./fractional-order.js";

describe("generateKeyBetween", () => {
	it("generates an initial key when there are no bounds", () => {
		const key = generateKeyBetween(null, null);
		expect(isFractionalOrderKey(key)).toBe(true);
	});

	it("generates keys that append after the lower bound", () => {
		let last = generateKeyBetween(null, null);
		for (let i = 0; i < 50; i++) {
			const next = generateKeyBetween(last, null);
			expect(next > last).toBe(true);
			expect(isFractionalOrderKey(next)).toBe(true);
			last = next;
		}
	});

	it("generates keys that prepend before the upper bound", () => {
		let first = generateKeyBetween(null, null);
		for (let i = 0; i < 50; i++) {
			const previous = generateKeyBetween(null, first);
			expect(previous < first).toBe(true);
			expect(isFractionalOrderKey(previous)).toBe(true);
			first = previous;
		}
	});

	it("generates keys strictly between two bounds under repeated bisection", () => {
		let lower = generateKeyBetween(null, null);
		let upper = generateKeyBetween(lower, null);

		for (let i = 0; i < 50; i++) {
			const mid = generateKeyBetween(lower, upper);
			expect(mid > lower).toBe(true);
			expect(mid < upper).toBe(true);
			expect(isFractionalOrderKey(mid)).toBe(true);
			//* alternate which bound moves to bisect in both directions
			if (i % 2 === 0) upper = mid;
			else lower = mid;
		}
	});

	it("never generates keys ending in the smallest digit", () => {
		let first = generateKeyBetween(null, null);
		for (let i = 0; i < 100; i++) {
			first = generateKeyBetween(null, first);
			expect(first.endsWith("0")).toBe(false);
		}
	});

	it("throws when the bounds are inverted or equal", () => {
		expect(() => generateKeyBetween("z", "i")).toThrow(LucidError);
		expect(() => generateKeyBetween("z", "i")).toThrow(
			'Fractional order lower bound "z" must sort before upper bound "i".',
		);
		expect(() => generateKeyBetween("i", "i")).toThrow(LucidError);
	});

	it("throws for invalid bound keys", () => {
		expect(() => generateKeyBetween("", null)).toThrow(LucidError);
		expect(() => generateKeyBetween("a0", null)).toThrow(
			"Invalid fractional order key: a0.",
		);
		expect(() => generateKeyBetween("A", null)).toThrow(LucidError);
	});
});

describe("isFractionalOrderKey", () => {
	it("accepts generated keys", () => {
		expect(isFractionalOrderKey(generateKeyBetween(null, null))).toBe(true);
	});

	it("rejects non-strings, empty strings, trailing zeros and unknown characters", () => {
		expect(isFractionalOrderKey(null)).toBe(false);
		expect(isFractionalOrderKey(1)).toBe(false);
		expect(isFractionalOrderKey("")).toBe(false);
		expect(isFractionalOrderKey("i0")).toBe(false);
		expect(isFractionalOrderKey("I")).toBe(false);
	});
});
