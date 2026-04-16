import { describe, expect, test } from "vitest";
import {
	assertAstroCompatibility,
	detectAstroRuntime,
	detectLucidRuntime,
} from "./internal/compatibility.js";
import {
	buildCloudflareRouteSource,
	buildNodeRouteSource,
} from "./internal/generated-sources.js";
import {
	buildCloudflareAdditionalWorkers,
	buildCloudflareMainWorkerSource,
} from "./internal/worker-module.js";

describe("@lucidcms/astro internals", () => {
	test("detects supported runtime combinations", () => {
		expect(detectLucidRuntime({ key: "node" } as never)).toBe("node");
		expect(detectLucidRuntime({ key: "cloudflare" } as never)).toBe(
			"cloudflare",
		);
		expect(
			detectAstroRuntime({
				name: "@astrojs/node",
			} as never),
		).toBe("node");
		expect(
			detectAstroRuntime({
				name: "@astrojs/cloudflare",
			} as never),
		).toBe("cloudflare");
	});

	test("rejects unsupported or mismatched runtimes", () => {
		expect(() => detectLucidRuntime(undefined)).toThrow(
			/configureLucid\(\{ adapter: \{ from:/,
		);
		expect(() => detectLucidRuntime({ key: "bun" } as never)).toThrow(
			/does not support the "bun" runtime adapter/,
		);
		expect(() => assertAstroCompatibility("node", undefined)).toThrow(
			/requires an Astro adapter/,
		);
		expect(() =>
			assertAstroCompatibility("node", {
				name: "@astrojs/cloudflare",
			} as never),
		).toThrow(/runtimes must match/);
		expect(
			assertAstroCompatibility("cloudflare", {
				name: "@astrojs/cloudflare",
			} as never),
		).toBe("cloudflare");
	});

	test("generates Node and Cloudflare route sources via lazy config resolution", () => {
		const nodeSource = buildNodeRouteSource("./lucid.config.ts");
		const cloudflareSource = buildCloudflareRouteSource("./lucid.config.ts");

		expect(nodeSource).toContain("resolveConfigDefinition");
		expect(nodeSource).toContain(
			'configureLucidPath: "@lucidcms/astro/configure-lucid"',
		);
		expect(nodeSource).not.toContain(
			'Reflect.get(lucidConfigModule, "envSchema")',
		);
		expect(nodeSource).not.toContain(
			'Reflect.get(lucidConfigModule, "adapter")',
		);
		expect(cloudflareSource).toContain(
			'configureLucidPath: "@lucidcms/astro/configure-lucid"',
		);
		expect(nodeSource).toContain("export const prerender = false;");
		expect(nodeSource).toContain("configEntryPoint: null");
		expect(nodeSource).toContain('request.headers.get("x-forwarded-for")');
		expect(cloudflareSource).toContain("export const prerender = false;");
	});

	test("generates the Cloudflare main worker with Astro fetch and Lucid scheduled handlers", () => {
		const source = buildCloudflareMainWorkerSource({
			configImportPath: "../lucid.config.ts",
			customArtifacts: [
				{
					type: "worker-export",
					custom: {
						imports: [
							{
								path: "./plugin.js",
								exports: ["queueHandler"],
							},
						],
						exports: [
							{
								name: "queue",
								params: ["batch", "env", "ctx"],
								content: "return queueHandler(batch, env, ctx);",
							},
						],
					},
				} as never,
			],
		});

		expect(source).toContain(
			'import astroWorker from "@astrojs/cloudflare/entrypoints/server";',
		);
		expect(source).toContain("...astroWorker");
		expect(source).toContain("async scheduled(controller, env, ctx)");
		expect(source).toContain("resolveConfigDefinition");
		expect(source).toContain(
			'configureLucidPath: "@lucidcms/astro/configure-lucid"',
		);
		expect(source).toContain("queue(batch, env, ctx)");
		expect(source).toContain('import { queueHandler } from "./plugin.js";');
	});

	test("generates additional Cloudflare worker entry files", () => {
		const workers = buildCloudflareAdditionalWorkers([
			{
				type: "worker-entry",
				custom: {
					filename: "workers/queue-consumer",
					imports: [
						{
							path: "./consumer.js",
							default: "consumer",
						},
					],
					exports: [
						{
							name: "fetch",
							params: ["request", "env", "ctx"],
							content: "return consumer.fetch(request, env, ctx);",
						},
					],
				},
			} as never,
		]);

		expect(workers).toHaveLength(1);
		expect(workers[0]?.filename).toBe("queue-consumer");
		expect(workers[0]?.source).toContain(
			'import consumer from "./consumer.js";',
		);
		expect(workers[0]?.source).toContain(
			"fetch(request, env, ctx) { return consumer.fetch(request, env, ctx); }",
		);
	});
});
