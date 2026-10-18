import { describe, expect, test } from "vitest";
import { IMMUTABLE_CACHE_CONTROL } from "../constants.js";
import mergeAssetHeaders from "./merge-asset-headers.js";

const ours = `/_assets/:asset\n  ! Cache-Control\n  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}\n`;

describe("mergeAssetHeaders", () => {
	test("adds one rule last, leaving the project's rules in order", () => {
		const existing =
			"/_assets/*\n  X-Frame-Options: DENY\n  Cache-Control: max-age=60\n\n/_assets/logo.svg\n  ! X-Frame-Options\n";

		expect(mergeAssetHeaders("")).toBe(ours);
		expect(mergeAssetHeaders(existing)).toBe(`${existing}\n${ours}`);
	});

	test("replaces the rule from an earlier build instead of repeating it", () => {
		const existing = "/*\n  X-Frame-Options: DENY\n";
		const merged = mergeAssetHeaders(existing);

		expect(mergeAssetHeaders(merged)).toBe(merged);
		expect(
			mergeAssetHeaders(`${merged}  /admin/*\n    X-Robots-Tag: noindex\n`),
		).toBe(`${existing}\n  /admin/*\n    X-Robots-Tag: noindex\n\n${ours}`);
	});
});
