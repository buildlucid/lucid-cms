/// <reference types="@cloudflare/workers-types" />

import type { MediaStorageAdapterInstance } from "@lucidcms/core/types";
import { describe, expect, test } from "vitest";
import { DEFAULT_MAX_UPLOAD_SIZE } from "./constants.js";
import plugin from "./plugin.js";

type PluginDraft = {
	i18n: {
		sources: Array<string | URL>;
	};
	media: Record<string, unknown>;
	http: {
		routes: unknown[];
	};
};

const buildDraft = (): PluginDraft => ({
	i18n: {
		sources: [],
	},
	media: {},
	http: {
		routes: [],
	},
});

const buildConfig = (uploadBytes: number) =>
	({
		media: {
			limits: {
				uploadBytes,
			},
		},
	}) as never;

describe("Cloudflare R2 plugin", () => {
	test("requires the Cloudflare runtime", () => {
		const cloudflareR2Plugin = plugin({
			binding: "MEDIA_BUCKET",
		});

		expect(() =>
			cloudflareR2Plugin.checkCompatibility?.({
				runtimeContext: {
					runtime: "node",
				} as never,
				config: buildConfig(16 * 1024 * 1024),
			}),
		).toThrow(/Cloudflare runtime adapter/);
	});

	test("enforces a binding upload limit when http fallback is disabled", () => {
		const cloudflareR2Plugin = plugin({
			binding: "MEDIA_BUCKET",
		});

		expect(() =>
			cloudflareR2Plugin.checkCompatibility?.({
				runtimeContext: {
					runtime: "cloudflare",
				} as never,
				config: buildConfig(DEFAULT_MAX_UPLOAD_SIZE + 1),
			}),
		).toThrow(/http fallback/);
	});

	test("returns signed Lucid upload URLs when using binding-only mode", async () => {
		const cloudflareR2Plugin = plugin({
			binding: "MEDIA_BUCKET",
		});
		const adapter = cloudflareR2Plugin.recipe
			? (() => {
					const draft = {
						i18n: {
							sources: [],
						},
						media: {},
						http: {
							routes: [],
						},
					} as {
						i18n: {
							sources: Array<string | URL>;
						};
						media: {
							storage?: MediaStorageAdapterInstance;
						};
						http: {
							routes: unknown[];
						};
					};
					cloudflareR2Plugin.recipe(draft as never);
					return draft.media.storage;
				})()
			: undefined;

		const result = await adapter?.createUploadSession({} as never, {
			key: "public/test.png",
			host: "https://example.com",
			secretKey: "a".repeat(64),
			fileName: "test.png",
			mimeType: "image/png",
			extension: "png",
			size: 1024,
		});

		expect(result?.error).toBeUndefined();
		expect(result?.data?.key).toBe("public/test.png");
		expect(result?.data?.protocol).toBe("http");
		if (result?.data?.protocol !== "http") return;
		expect(result.data.request.url).toContain(
			"/lucid/api/v1/media/r2/storage/upload?",
		);
		expect(result.data.request.url).toContain("extension=png");
	});

	test("registers plugin-owned storage routes in binding-only mode", () => {
		const cloudflareR2Plugin = plugin({
			binding: "MEDIA_BUCKET",
		});
		const draft = buildDraft();

		cloudflareR2Plugin.recipe(draft as never);

		expect(draft.http.routes).toHaveLength(2);
	});

	test("does not register storage routes when http fallback is enabled", () => {
		const cloudflareR2Plugin = plugin({
			binding: "MEDIA_BUCKET",
			http: {
				endpoint: "https://example.com",
				bucket: "media",
				clientOptions: {
					accessKeyId: "key",
					secretAccessKey: "secret",
				},
			},
		});
		const draft = buildDraft();

		cloudflareR2Plugin.recipe(draft as never);

		expect(draft.http.routes).toHaveLength(0);
	});
});
