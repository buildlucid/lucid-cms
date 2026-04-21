import { describe, expect, test } from "vitest";
import {
	buildCloudflareAdminBarMiddlewareSource,
	buildLucidAdminBarDevToolbarAppSource,
	buildNodeAdminBarMiddlewareSource,
} from "./internal/admin-bar/generated-sources.js";
import {
	assertAstroCompatibility,
	detectAstroRuntime,
	detectLucidRuntime,
} from "./internal/compatibility.js";
import {
	buildCloudflareRouteSource,
	buildNodeRouteSource,
} from "./internal/generated-sources.js";
import { buildCloudflareMainWorkerSource } from "./internal/worker-module.js";

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
			/configureLucid\(\{ adapter: \{ module:/,
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

	test("generates Node and Cloudflare route sources with concrete adapter imports", () => {
		const nodeSource = buildNodeRouteSource(
			"./lucid.config.ts",
			"@lucidcms/node-adapter",
			"@lucidcms/sqlite-adapter",
		);
		const cloudflareSource = buildCloudflareRouteSource(
			"./lucid.config.ts",
			"@lucidcms/sqlite-adapter",
		);

		expect(nodeSource).toContain('import("@lucidcms/node-adapter")');
		expect(nodeSource).toContain(
			'import ConfiguredDatabaseAdapter from "@lucidcms/sqlite-adapter";',
		);
		expect(nodeSource).toContain(
			'import configureLucid from "@lucidcms/astro/configure-lucid";',
		);
		expect(nodeSource).not.toContain("resolveConfigDefinition");
		expect(nodeSource).not.toContain(
			'Reflect.get(lucidConfigModule, "envSchema")',
		);
		expect(nodeSource).not.toContain(
			'Reflect.get(lucidConfigModule, "adapter")',
		);
		expect(cloudflareSource).toContain(
			'import("@lucidcms/astro/configure-lucid")',
		);
		expect(nodeSource).toContain("export const prerender = false;");
		expect(nodeSource).toContain("configEntryPoint: null");
		expect(nodeSource).toContain('request.headers.get("x-forwarded-for")');
		expect(cloudflareSource).toContain("export const prerender = false;");
		expect(cloudflareSource).toContain(
			"context.locals?.cfContext ?? undefined",
		);
		expect(cloudflareSource).not.toContain("currentExecutionContext");
	});

	test("generates Node and Cloudflare admin bar middleware sources", () => {
		const nodeSource = buildNodeAdminBarMiddlewareSource(
			"./lucid.config.ts",
			"@lucidcms/node-adapter",
			"@lucidcms/sqlite-adapter",
			{
				disable: false,
			},
		);
		const cloudflareSource = buildCloudflareAdminBarMiddlewareSource(
			"./lucid.config.ts",
			"@lucidcms/sqlite-adapter",
			{
				disable: true,
			},
		);

		expect(nodeSource).toContain(
			'import { defineMiddleware } from "astro:middleware";',
		);
		expect(nodeSource).toContain(
			'import { maybeInjectLucidAdminBar } from "@lucidcms/astro/runtime";',
		);
		expect(nodeSource).toContain('"disable": false');
		expect(nodeSource).toContain("return maybeInjectLucidAdminBar({");
		expect(nodeSource).toContain("return app.fetch(request);");

		expect(cloudflareSource).toContain(
			'import { defineMiddleware } from "astro:middleware";',
		);
		expect(cloudflareSource).toContain('"disable": true');
		expect(cloudflareSource).toContain(
			"context.locals?.cfContext ?? undefined",
		);
		expect(cloudflareSource).toContain("return maybeInjectLucidAdminBar({");
	});

	test("generates the Lucid dev toolbar app source", () => {
		const source = buildLucidAdminBarDevToolbarAppSource();

		expect(source).toContain(
			'import { defineToolbarApp } from "astro/toolbar";',
		);
		expect(source).toContain("astro-dev-toolbar-window");
		expect(source).toContain("Docs");
		expect(source).toContain("Edit document");
		expect(source).toContain(
			"https://lucidcms.io/en/cms/docs/getting-started/what-is-lucid-cms/",
		);
		expect(source).toContain("window.location.assign");
		expect(source).toContain(
			'window.open(href, "_blank", "noopener,noreferrer")',
		);
		expect(source).toContain("lucid:admin-bar-state");
		expect(source).not.toContain("Logout");
		expect(source).not.toContain("Login");
	});

	test("generates the Cloudflare main worker with Astro fetch and Lucid scheduled handlers", () => {
		const source = buildCloudflareMainWorkerSource({
			configImportPath: "../lucid.config.ts",
			databaseAdapterImportPath: "@lucidcms/sqlite-adapter",
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
		expect(source).toContain("astroConfigureLucid(configDefinition");
		expect(source).toContain(
			'import astroConfigureLucid from "@lucidcms/astro/configure-lucid";',
		);
		expect(source).toContain("queue(batch, env, ctx)");
		expect(source).toContain('import { queueHandler } from "./plugin.js";');
	});
});
