/// <reference types="@cloudflare/workers-types" />

import { describe, expect, it } from "vitest";
import plugin from "./plugin.js";

describe("Cloudflare Images plugin", () => {
	it("requires the Cloudflare runtime", () => {
		const instance = plugin();

		expect(() =>
			instance.checkCompatibility?.({
				runtimeContext: { runtime: "node" } as never,
				config: {} as never,
			}),
		).toThrow(/Cloudflare runtime adapter/);
	});

	it("registers translations and the configured processor", () => {
		const instance = plugin({ binding: "CUSTOM_IMAGES" });
		const defaults = instance.defaults;
		if (!defaults || typeof defaults === "function") {
			throw new Error("Images plugin did not provide adapter defaults.");
		}
		const adapter = defaults.media?.delivery;
		if (
			!adapter ||
			adapter instanceof Promise ||
			typeof adapter === "function"
		) {
			throw new Error("Images plugin did not register a delivery adapter.");
		}

		expect(instance.sources?.translations).toContain(
			"@lucidcms/plugin-cloudflare-images/translations",
		);
		expect(adapter.key).toBe("cloudflare-images");
	});

	it("requests the default and custom Images binding in prepare artifacts", async () => {
		const defaultResult = await plugin().hooks?.runtime?.({
			phase: "prepare",
			env: {},
			paths: { configPath: "/tmp/lucid.config.ts", projectRoot: "/tmp" },
			definition: {} as never,
		});
		const customResult = await plugin({
			binding: "CUSTOM_IMAGES",
		}).hooks?.runtime?.({
			phase: "prepare",
			env: {},
			paths: { configPath: "/tmp/lucid.config.ts", projectRoot: "/tmp" },
			definition: {} as never,
		});

		expect(defaultResult?.data?.artifacts).toEqual([
			{
				type: "cloudflare:wrangler",
				custom: { bindings: { images: true } },
			},
		]);
		expect(customResult?.data?.artifacts).toEqual([
			{
				type: "cloudflare:wrangler",
				custom: { bindings: { images: "CUSTOM_IMAGES" } },
			},
		]);
	});
});
