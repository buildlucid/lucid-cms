import { expect, test } from "vitest";
import { webResponseSchema, webScopeSchema, webUrlSchema } from "./web.js";

const usage = {
	kind: "web",
	operation: "search",
	provider: "parallel",
	requests: 1,
	model: null,
	tokens: null,
	providerRequestId: "search_1",
	cost: { creditsCharged: "12" },
};

test("reads responses leniently so the website can add fields within a version", () => {
	const parsed = webResponseSchema.parse({
		requestId: "5f0c9d0e-0f4b-4b8e-9c4b-6d6c0f1f3a2e",
		mode: "sync",
		feature: { key: "web.search", version: "v1" },
		usage: { ...usage, cost: { creditsCharged: "12", addedLater: true } },
		output: {
			addedLater: true,
			results: [
				{ url: "http://localhost", title: "Unusable", excerpts: [] },
				{
					url: "https://example.com",
					title: "Example",
					excerpts: ["Text"],
					favicon: "https://example.com/favicon.ico",
				},
				...Array.from({ length: 10 }, (_, index) => ({
					url: `https://example.com/${index}`,
				})),
			],
		},
	});
	expect(parsed.output).toEqual({
		results: expect.arrayContaining([
			{
				url: "https://example.com",
				title: "Example",
				publishedAt: null,
				excerpts: ["Text"],
			},
		]),
	});
	expect("results" in parsed.output && parsed.output.results).toHaveLength(11);
});

test.each([
	"http://localhost",
	"http://127.0.0.1",
	"http://2130706433",
	"http://[::1]",
	"http://169.254.169.254",
	"https://example.com:8443",
	"https://user:pass@example.com",
	"file:///etc/passwd",
	"https://host.internal",
])("rejects non-public website input %s", (url) => {
	expect(webUrlSchema.safeParse(url).success).toBe(false);
});

test("domain scopes normalise hostnames and need at least one", () => {
	expect(webScopeSchema.parse({ allowedDomains: [" Example.com "] })).toEqual({
		allowedDomains: ["example.com"],
	});
	expect(webScopeSchema.safeParse({ allowedDomains: [] }).success).toBe(false);
});
