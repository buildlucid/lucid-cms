import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build } from "rolldown";
import { expect, test } from "vitest";
import type { prepareResources } from "../resources/prepare-resources.js";
import prepareConfigArtifacts from "./prepare-config-artifacts.js";

const runNode = promisify(execFile);

test("bundles discovered definitions and their imports without needing the source tree at runtime", async () => {
	// Keep package resolution identical to a workspace application.
	const root = await mkdtemp(
		path.join(process.cwd(), ".lucid-resource-build-"),
	);
	const write = async (file: string, contents: string) => {
		const target = path.join(root, file);
		await mkdir(path.dirname(target), { recursive: true });
		await writeFile(target, contents);
		return target;
	};
	try {
		await write("package.json", '{"type":"module"}');
		const configPath = await write(
			"lucid.config.ts",
			`import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { sqlite } from "@lucidcms/db-sqlite";
import { greeting } from "./src/helper.js";
export default defineConfig({ runtime: node, db: sqlite, config: () => ({ brand: {name: "Before"} }), configure(draft) { draft.brand.name = greeting; } });`,
		);
		await write(
			"src/helper.ts",
			'export const greeting = "compiled greeting";',
		);
		await write(
			"src/lucid/routes/nested/hello.ts",
			`import { defineRoute } from "@lucidcms/core";
import { greeting } from "../../../helper.js";
export default defineRoute({ method: "get", path: "/hello", handler: () => new Response(greeting) });`,
		);
		await write(
			"src/lucid/collections/pages.ts",
			`import { CollectionBuilder } from "@lucidcms/core";
export default new CollectionBuilder("pages", {mode: "multiple", details: {labels: {plural: "Pages", singular: "Page"}}}).addText("title");`,
		);
		await write(
			"src/lucid/tables/nested/events.ts",
			`import { defineTable, z } from "@lucidcms/core";
export default defineTable("events", {columns: {title: {schema: z.string(), type: "text"}}});`,
		);

		await write(
			"src/lucid/hooks/fetched.ts",
			`import { defineHook } from "@lucidcms/core";
export default defineHook({service: "documents", event: "afterFetch", handler: async () => ({error: undefined, data: undefined})});`,
		);
		await write(
			"src/lucid/jobs/example.ts",
			`import { defineJob } from "@lucidcms/core";
export default defineJob({name: "test:example", version: 1, handler: async () => ({error: undefined, data: undefined})});`,
		);
		await write(
			"src/lucid/migrations/1751400000000-example.ts",
			'throw new Error("Migration must not enter the runtime bundle");',
		);
		await write(
			"src/lucid/seeds/example.ts",
			'throw new Error("Seed must not enter the runtime bundle");',
		);

		// The package loader and its factories must share the same built core module instances.
		const loaderScript = await write(
			"prepare.mjs",
			`import { loadBuildProject } from "@lucidcms/core/build";
const result = await loadBuildProject({configPath: ${JSON.stringify(configPath)}, generateTypes: false, silent: true});
console.log(JSON.stringify(result.loaded.resources));`,
		);
		const { stdout } = await runNode(process.execPath, [loaderScript]);
		const resources = JSON.parse(stdout) as Awaited<
			ReturnType<typeof prepareResources>
		>["resources"];
		expect(resources.modules.collections).toHaveLength(1);
		expect(resources.modules.jobs).toHaveLength(1);
		expect(resources.modules.tables).toHaveLength(1);
		const outputPath = path.join(root, "dist");
		const artifacts = await prepareConfigArtifacts({
			configPath,
			outputPath,
			resources,
		});
		const bundledPath = path.join(outputPath, "config.mjs");
		await build({
			input: artifacts.config,
			output: { file: bundledPath, format: "esm" },
			platform: "node",
			external: (id) => id.startsWith("@lucidcms/"),
		});
		const code = await readFile(bundledPath, "utf8");
		expect(code).not.toMatch(
			/node:fs|prepareResources|collectResourceFiles|Migration must not|Seed must not/,
		);
		await rm(path.join(root, "src"), { recursive: true });
		await rm(configPath);
		const runner = await write(
			"run.mjs",
			`import factory, { configure } from ${JSON.stringify(pathToFileURL(bundledPath).href)};
const config = factory({});
configure(config);
console.log(JSON.stringify({
 brand: config.brand.name,
 collections: config.collections.map(value => value.key),
 tables: config.tables.map(value => ({name: value.name, resolve: typeof value.resolve})),
 route: await (await config.http.routes[0].handler()).text(),
 hook: config.hooks[0].event,
 job: config.jobs.definitions[0].name,
}));`,
		);
		const result = await runNode(process.execPath, [runner]);
		expect(JSON.parse(result.stdout)).toEqual({
			brand: "compiled greeting",
			collections: ["pages"],
			tables: [{ name: "events", resolve: "function" }],
			route: "compiled greeting",
			hook: "afterFetch",
			job: "test:example",
		});
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}, 30_000);
