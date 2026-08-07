import { describe, expect, test, vi } from "vitest";
import cloudflareAstroIntegration from "./astro-integration.js";
import { cloudflare } from "./runtime.js";

describe("Cloudflare Astro integration lifecycle", () => {
	test("clears and disposes the owned platform proxy exactly once", async () => {
		const runtime = cloudflare();
		const dispose = vi.fn(async () => {
			expect(runtime.getPlatformProxy()).toBeUndefined();
		});
		runtime.setPlatformProxy({ env: {}, dispose } as never);

		await cloudflareAstroIntegration.teardown({ adapter: runtime });
		await cloudflareAstroIntegration.teardown({ adapter: runtime });

		expect(runtime.getPlatformProxy()).toBeUndefined();
		expect(dispose).toHaveBeenCalledOnce();
	});

	test("clears the platform proxy when disposal fails", async () => {
		const runtime = cloudflare();
		const error = new Error("Proxy disposal failed");
		runtime.setPlatformProxy({
			env: {},
			dispose: vi.fn().mockRejectedValue(error),
		} as never);

		await expect(
			cloudflareAstroIntegration.teardown({ adapter: runtime }),
		).rejects.toBe(error);
		expect(runtime.getPlatformProxy()).toBeUndefined();
	});
});
