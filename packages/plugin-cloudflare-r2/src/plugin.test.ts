/// <reference types="@cloudflare/workers-types" />

import { describe, expect, test } from "vitest";
import { DEFAULT_MAX_UPLOAD_SIZE } from "./constants.js";
import plugin from "./plugin.js";

type PluginDraft = {
	media: Record<string, unknown>;
	hono: {
		routes: unknown[];
	};
};

const buildConfig = (fileSize: number) =>
	({
		media: {
			limits: {
				fileSize,
			},
		},
	}) as never;

describe("Cloudflare R2 plugin", () => {
	test("requires the Cloudflare runtime", () => {
		const cloudflareR2Plugin = plugin({
			binding: {} as R2Bucket,
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
			binding: {} as R2Bucket,
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
			binding: {} as R2Bucket,
		});
		const adapter = cloudflareR2Plugin.recipe
			? (() => {
					const draft = {
						media: {},
					} as {
						media: {
							adapter?: {
								getPresignedUrl: (
									key: string,
									meta: {
										host: string;
										secretKey: string;
										mimeType: string;
										extension?: string;
									},
								) => Promise<{
									error?: {
										type: string;
										message: string;
									};
									data?: {
										url: string;
									};
								}>;
							};
						};
					};
					cloudflareR2Plugin.recipe(draft as never);
					return draft.media.adapter;
				})()
			: undefined;

		const result = await adapter?.getPresignedUrl("public/test.png", {
			host: "https://example.com",
			secretKey: "a".repeat(64),
			mimeType: "image/png",
			extension: "png",
		});

		expect(result?.error).toBeUndefined();
		expect(result?.data?.url).toContain(
			"/lucid/api/v1/media/r2/storage/upload?",
		);
		expect(result?.data?.url).toContain("extension=png");
	});

	test("registers plugin-owned storage routes in binding-only mode", () => {
		const cloudflareR2Plugin = plugin({
			binding: {} as R2Bucket,
		});
		const draft: PluginDraft = {
			media: {},
			hono: {
				routes: [],
			},
		};

		cloudflareR2Plugin.recipe(draft as never);

		expect(draft.hono.routes).toHaveLength(1);
	});

	test("does not register storage routes when http fallback is enabled", () => {
		const cloudflareR2Plugin = plugin({
			binding: {} as R2Bucket,
			http: {
				endpoint: "https://example.com",
				bucket: "media",
				clientOptions: {
					accessKeyId: "key",
					secretAccessKey: "secret",
				},
			},
		});
		const draft: PluginDraft = {
			media: {},
			hono: {
				routes: [],
			},
		};

		cloudflareR2Plugin.recipe(draft as never);

		expect(draft.hono.routes).toHaveLength(0);
	});
});
