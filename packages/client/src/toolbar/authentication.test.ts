// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveToolbarAuthentication } from "./authentication.js";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("toolbar authentication", () => {
	it("deduplicates automatic checks per CMS origin", async () => {
		const fetch = vi
			.spyOn(window, "fetch")
			.mockResolvedValue(new Response(null, { status: 204 }));
		const host = new URL(`https://cms-${crypto.randomUUID()}.example.com/path`);

		const [first, second] = await Promise.all([
			resolveToolbarAuthentication(window, host),
			resolveToolbarAuthentication(window, new URL(host.origin)),
		]);

		expect(first).toBe(true);
		expect(second).toBe(true);
		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch).toHaveBeenCalledWith(
			new URL("/lucid/api/v1/auth/status", host),
			expect.objectContaining({ credentials: "include" }),
		);
	});

	it("lets settled and application-owned authentication bypass the cache", async () => {
		const fetch = vi.spyOn(window, "fetch");
		const resolveAuthentication = vi.fn().mockResolvedValue(true);
		const host = new URL("https://cms.example.com");

		expect(await resolveToolbarAuthentication(window, host, false)).toBe(false);
		expect(
			await resolveToolbarAuthentication(window, host, resolveAuthentication),
		).toBe(true);

		expect(resolveAuthentication).toHaveBeenCalledOnce();
		expect(fetch).not.toHaveBeenCalled();
	});
});
