// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { isSignedIn } from "./authentication.js";

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
			isSignedIn(window, host),
			isSignedIn(window, new URL(host.origin)),
		]);

		expect(first).toBe(true);
		expect(second).toBe(true);
		expect(fetch).toHaveBeenCalledOnce();
		expect(fetch).toHaveBeenCalledWith(
			new URL("/api/v1/auth/status", host),
			expect.objectContaining({ credentials: "include" }),
		);
	});
});
