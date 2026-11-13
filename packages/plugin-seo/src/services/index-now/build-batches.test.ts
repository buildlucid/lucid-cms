import { describe, expect, test } from "vitest";
import buildBatches from "./build-batches.js";

describe("buildBatches", () => {
	test("groups URLs by origin, at most 10,000 a batch", () => {
		const pages = Array.from(
			{ length: 10_001 },
			(_, index) => `https://example.com/${index}`,
		);

		expect(
			buildBatches([...pages, "https://example.fr:8443/a-propos"]).map(
				(batch) => [batch.origin, batch.host, batch.urls.length],
			),
		).toEqual([
			["https://example.com", "example.com", 10_000],
			["https://example.com", "example.com", 1],
			["https://example.fr:8443", "example.fr:8443", 1],
		]);
	});
});
