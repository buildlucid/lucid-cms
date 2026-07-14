import { describe, expect, it } from "vitest";
import normalizePreviewUrl from "./normalize-preview-url.js";

describe("normalizePreviewUrl", () => {
	it("preserves query values and hashes while adding the preview token", async () => {
		const response = await normalizePreviewUrl(
			"https://site.example/about?campaign=one#content",
			"a".repeat(43),
		);
		expect(response.error).toBeUndefined();
		const url = new URL(response.data as string);

		expect(url.searchParams.get("campaign")).toBe("one");
		expect(url.searchParams.get("preview")).toBe("a".repeat(43));
		expect(url.hash).toBe("#content");
	});

	it("returns non-http preview URL errors as data", async () => {
		const response = await normalizePreviewUrl(
			"javascript:alert(1)",
			"a".repeat(43),
		);

		expect(response.error?.status).toBe(400);
		expect(response.data).toBeUndefined();
	});
});
