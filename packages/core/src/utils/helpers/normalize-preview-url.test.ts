import { describe, expect, it } from "vitest";
import normalizePreviewUrl, {
	resolveDefaultPreviewUrl,
} from "./normalize-preview-url.js";

describe("resolveDefaultPreviewUrl", () => {
	it("resolves route paths on the configured CMS origin", () => {
		expect(
			resolveDefaultPreviewUrl(
				"https://example.com/lucid",
				"en/about",
			)?.toString(),
		).toBe("https://example.com/en/about");
		expect(resolveDefaultPreviewUrl("https://example.com", null)).toBeNull();
	});

	it("does not allow a protocol-relative route path to replace the origin", () => {
		const url = resolveDefaultPreviewUrl(
			"https://example.com",
			"//elsewhere.example/page",
		);

		expect(url?.origin).toBe("https://example.com");
		expect(url?.pathname).toBe("//elsewhere.example/page");
	});
});

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
