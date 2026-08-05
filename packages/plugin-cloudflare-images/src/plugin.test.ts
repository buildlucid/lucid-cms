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
		const draft = {
			i18n: { sources: [] as Array<string | URL> },
			media: { images: {} as { processor?: { key: string } } },
		};

		instance.recipe(draft as never);

		expect(draft.i18n.sources).toContain(
			"@lucidcms/plugin-cloudflare-images/translations",
		);
		expect(draft.media.images.processor?.key).toBe("cloudflare-images");
	});

	it("requests the default and custom Images binding in prepare artifacts", async () => {
		const defaultResult = await plugin().hooks?.runtime?.({
			phase: "prepare",
			definition: {} as never,
		});
		const customResult = await plugin({
			binding: "CUSTOM_IMAGES",
		}).hooks?.runtime?.({
			phase: "prepare",
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
