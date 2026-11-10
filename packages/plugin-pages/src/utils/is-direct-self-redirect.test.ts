import { describe, expect, test } from "vitest";
import isDirectSelfRedirect from "./is-direct-self-redirect.js";

const urlRedirect = (from: string, targetUrl: string) => ({
	from,
	locale: null,
	targetType: "url" as const,
	targetUrl,
});

describe("self redirects", () => {
	test("catches targets that come back to the source as a browser requests them", () => {
		expect(isDirectSelfRedirect(urlRedirect("/a", "/A/?ref=1"))).toBe(true);
		expect(isDirectSelfRedirect(urlRedirect("/a", "/x/../a#top"))).toBe(true);
	});

	test("allows other paths and full addresses", () => {
		expect(isDirectSelfRedirect(urlRedirect("/a", "/b"))).toBe(false);
		expect(
			isDirectSelfRedirect(urlRedirect("/a", "https://example.com/a")),
		).toBe(false);
	});
});
