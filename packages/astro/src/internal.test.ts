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

	test("generates Node and Cloudflare admin bar middleware sources", () => {
		const nodeSource = buildNodeAdminBarMiddlewareSource(configArtifacts, {
			disable: false,
		});
		const cloudflareSource = buildCloudflareAdminBarMiddlewareSource(
			configArtifacts,
			{
				disable: true,
			},
		);

		expect(nodeSource).toContain(
			'import { defineMiddleware } from "astro:middleware";',
		);
		expect(nodeSource).toContain(
			'import { maybeInjectLucidAdminBar } from "@lucidcms/astro/internal/admin-bar";',
		);
		expect(nodeSource).toContain('"disable": false');
		expect(nodeSource).toContain("return maybeInjectLucidAdminBar({");
		expect(nodeSource).toContain("return app.fetch(request);");
		expect(nodeSource).toContain(
			"const runtimeAdapter = await resolveRuntime();",
		);
		expect(nodeSource).toContain("runtimeAdapter.getEnvVars");

		expect(cloudflareSource).toContain(
			'import { defineMiddleware } from "astro:middleware";',
		);
		expect(cloudflareSource).toContain('"disable": true');
		expect(cloudflareSource).toContain(
			"context.locals?.cfContext ?? undefined",
		);
		expect(cloudflareSource).toContain("runtimeAdapter.resolveOptions");
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
