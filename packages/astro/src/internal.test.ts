import { describe, expect, test } from "vitest";
import { getHostedConfigureLucidPath } from "./integration/project.js";
import {
	assertAstroCompatibility,
	detectAstroRuntime,
	detectLucidRuntime,
} from "./internal/compatibility.js";
import {
	buildCloudflareRouteSource,
	buildCloudflareToolkitSource,
	buildNodeRouteSource,
	buildNodeToolkitSource,
} from "./internal/generated-sources.js";
import { buildCloudflareMainWorkerSource } from "./internal/worker-module.js";

const configArtifacts = {
	config: "./lucid/config.js",
	env: "./lucid/env.js",
	db: "./lucid/db.js",
	runtime: "./lucid/runtime.js",
};

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

	test("resolves hosted configureLucid wrapper from the Astro package", () => {
		const configureLucidPath = getHostedConfigureLucidPath();

		expect(configureLucidPath).not.toBe("@lucidcms/astro/configure-lucid");
		expect(configureLucidPath).toContain("configure-lucid");
	});

	test("rejects unsupported or mismatched runtimes", () => {
		expect(() => detectLucidRuntime(undefined)).toThrow(
			/configureLucid\(\{ runtime, db, config \}\)/,
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

	test("generates Node and Cloudflare route sources with split config artifacts", () => {
		const nodeSource = buildNodeRouteSource(configArtifacts);
		const cloudflareSource = buildCloudflareRouteSource(configArtifacts);

		expect(nodeSource).toContain(
			'import configFactory from "./lucid/config.js";',
		);
		expect(nodeSource).toContain('import db from "./lucid/db.js";');
		expect(nodeSource).toContain('import runtime from "./lucid/runtime.js";');
		expect(nodeSource).not.toContain('import("@lucidcms/runtime-node")');
		expect(nodeSource).toContain("resolveDatabaseAdapter");
		expect(nodeSource).toContain(
			'import configureLucid from "@lucidcms/astro/configure-lucid";',
		);
		expect(nodeSource).not.toContain("resolveConfigDefinition");
		expect(nodeSource).toContain(
			'const runtimeValue = typeof runtime === "function" ? runtime() : runtime;',
		);
		expect(nodeSource).toContain(
			"const runtimeAdapter = await resolveRuntime();",
		);
		expect(nodeSource).toContain("runtime: runtimeAdapter");
		expect(nodeSource).toContain("runtimeAdapter.getEnvVars");
		expect(cloudflareSource).toContain(
			'import configureLucid from "@lucidcms/astro/configure-lucid";',
		);
		expect(cloudflareSource).toContain(
			'import configFactory from "./lucid/config.js";',
		);
		expect(cloudflareSource).toContain('import db from "./lucid/db.js";');
		expect(cloudflareSource).not.toContain("loadRuntimeModules");
		expect(nodeSource).toContain("export const prerender = false;");
		expect(nodeSource).toContain("configEntryPoint: null");
		expect(nodeSource).toContain('request.headers.get("x-forwarded-for")');
		expect(cloudflareSource).toContain("export const prerender = false;");
		expect(cloudflareSource).toContain(
			"context.locals?.cfContext ?? undefined",
		);
		expect(cloudflareSource).toContain("runtimeAdapter.resolveOptions");
		expect(cloudflareSource).not.toContain("currentExecutionContext");
	});

	test("generates toolkit sources that resolve no-call runtime adapters", () => {
		const nodeSource = buildNodeToolkitSource(configArtifacts);
		const cloudflareSource = buildCloudflareToolkitSource(configArtifacts);

		expect(nodeSource).toContain(
			"const runtimeAdapter = await resolveRuntime();",
		);
		expect(nodeSource).toContain("runtime: runtimeAdapter");
		expect(nodeSource).toContain("runtimeAdapter.getEnvVars");
		expect(cloudflareSource).toContain(
			"const runtimeAdapter = await resolveRuntime();",
		);
		expect(cloudflareSource).toContain("runtime: runtimeAdapter");
		expect(cloudflareSource).toContain("runtimeAdapter.resolveOptions");
	});

	test("generates the Cloudflare main worker with Astro fetch and Lucid scheduled handlers", () => {
		const source = buildCloudflareMainWorkerSource({
			configArtifacts,
			customArtifacts: [
				{
					type: "cloudflare:worker-export",
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
		expect(source).toContain("astroConfigureLucid({");
		expect(source).toContain('import configFactory from "./lucid/config.js";');
		expect(source).toContain('import db from "./lucid/db.js";');
		expect(source).toContain(
			'import astroConfigureLucid from "@lucidcms/astro/configure-lucid";',
		);
		expect(source).toContain("queue(batch, env, ctx)");
		expect(source).toContain('import { queueHandler } from "./plugin.js";');
	});
});
