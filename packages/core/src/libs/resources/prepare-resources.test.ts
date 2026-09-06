import {
	mkdir,
	mkdtemp,
	readFile,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, test } from "vitest";
import { resolveSourcePath } from "../../utils/helpers/resolve-source-path.js";
import { prepareResources } from "./prepare-resources.js";

let root: string;
const write = async (name: string, source: string) => {
	const file = path.join(root, name);
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, source);
	return file;
};
const route = (url: string) =>
	`export default { method: "get", path: ${JSON.stringify(url)}, handler: ({ hono }) => hono.text("ok") };`;
beforeEach(async () => {
	root = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "lucid-discovery-")),
	);
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

test("discovers nested ESM resources and ignores helpers, tests, declarations and unsupported extensions", async () => {
	for (const extension of ["ts", "mts", "js", "mjs"])
		await write(
			`src/lucid/routes/nested/${extension}.${extension}`,
			route(`/${extension}`),
		);
	await write(
		"src/lucid/routes/helpers.ts",
		"export const helper = () => true;",
	);
	for (const file of [
		"bad.test.ts",
		"bad.spec.mjs",
		"bad.d.ts",
		"__tests__/bad.ts",
		"bad.cjs",
	])
		await write(
			`src/lucid/routes/${file}`,
			'throw new Error("Do not import");',
		);
	const result = await prepareResources({}, root);
	expect(result.config.http?.routes?.map((entry) => entry.path)).toEqual([
		"/js",
		"/mjs",
		"/mts",
		"/ts",
	]);
	expect(result.resources.modules.routes).toHaveLength(4);
	expect(result.resources.watch).toContain(path.join(root, "src/lucid/jobs"));
});

test("disabling project discovery preserves explicit registrations and plugin sources", async () => {
	const pluginRoute = await write("plugin-routes/route.mjs", route("/plugin"));
	await write("src/lucid/routes/route.mjs", 'throw new Error("Disabled");');
	const explicit = {
		method: "get" as const,
		path: "/explicit",
		handler: () => new Response("explicit"),
	};
	const result = await prepareResources(
		{
			discovery: { routes: false },
			http: { routes: [explicit] },
			plugins: [
				{
					key: "example",
					lucid: "*",
					sources: { routes: [pathToFileURL(pluginRoute)] },
					configure: () => {},
				},
			],
		},
		root,
	);
	expect(result.config.http?.routes?.map((entry) => entry.path)).toEqual([
		"/explicit",
		"/plugin",
	]);
});

test("replaces a default directory and rejects missing configured sources", async () => {
	await write("custom/route.mjs", route("/custom"));
	await write("src/lucid/routes/default.mjs", route("/default"));
	const result = await prepareResources(
		{ discovery: { routes: "./custom" } },
		root,
	);
	expect(result.config.http?.routes?.map((entry) => entry.path)).toEqual([
		"/custom",
	]);
	await expect(
		prepareResources({ discovery: { routes: "./missing" } }, root),
	).rejects.toThrow("could not be read");
});

test("reports invalid default exports and duplicate resource origins", async () => {
	await write("src/lucid/routes/invalid.ts", "export default () => {}; ");
	await expect(prepareResources({}, root)).rejects.toThrow(
		/Invalid routes.*invalid.ts/,
	);
	await rm(path.join(root, "src/lucid/routes/invalid.ts"));
	await write("src/lucid/routes/first.ts", route("/same"));
	await write("src/lucid/routes/nested/second.ts", route("/same"));
	await expect(prepareResources({}, root)).rejects.toThrow(
		/Duplicate routes.*first.ts.*second.ts/,
	);
});

test("preserves source precedence and nested names for data and public resources", async () => {
	await write("plugin/templates/account/welcome.mustache", "plugin");
	await write("project/templates/account/welcome.mustache", "project source");
	await write(
		"src/lucid/templates/account/welcome.mustache",
		"project directory",
	);
	await write("assets/icons/logo.svg", "logo");
	const result = await prepareResources(
		{
			plugins: [
				{
					key: "example",
					lucid: "*",
					sources: { templates: ["./plugin/templates"] },
					configure: () => {},
				},
			],
			sources: {
				templates: ["./project/templates"],
				public: [{ input: "./assets", output: "brand" }],
			},
		},
		root,
	);
	expect(result.resources.files.templates.map((file) => file.name)).toEqual(
		Array(3).fill("account/welcome.mustache"),
	);
	expect(result.resources.files.public[0]?.name).toBe("brand/icons/logo.svg");
});

test("deduplicates linked sources, terminates symlink loops and tracks external dependencies", async () => {
	const file = await write(
		"shared/route.ts",
		'import { url } from "./helper.ts"; export default { method: "get", path: url, handler: () => new Response() };',
	);
	await write("shared/helper.ts", 'export const url = "/external";');
	await mkdir(path.join(root, "src/lucid"), { recursive: true });
	await symlink(path.join(root, "shared"), path.join(root, "src/lucid/routes"));
	await symlink(path.join(root, "shared"), path.join(root, "shared/loop"));
	const result = await prepareResources(
		{ sources: { routes: [pathToFileURL(file)] } },
		root,
	);
	expect(result.resources.modules.routes).toEqual([file]);
	expect(result.resources.watch).toContain(path.join(root, "shared/helper.ts"));
});

test("resolves exported package directories from the owning project and refuses private paths", async () => {
	await write(
		"node_modules/@example/resources/package.json",
		JSON.stringify({
			name: "@example/resources",
			exports: { "./routes": { import: "./dist/routes" } },
		}),
	);
	const file = await write(
		"node_modules/@example/resources/dist/routes/example.mjs",
		route("/package"),
	);
	const result = await prepareResources(
		{ sources: { routes: ["@example/resources/routes"] } },
		root,
	);
	expect(result.resources.modules.routes).toEqual([file]);
	await expect(
		resolveSourcePath("@example/resources/dist/routes", { projectRoot: root }),
	).rejects.toThrow("could not be resolved");
});

test("inventories migrations and seeds without importing or executing them", async () => {
	await write(
		"src/lucid/migrations/1751400000000-example.ts",
		'throw new Error("Command only");',
	);
	await write("src/lucid/seeds/example.ts", 'throw new Error("Command only");');
	const result = await prepareResources({}, root);
	expect(result.resources.files.migrations).toHaveLength(1);
	expect(result.resources.files.seeds).toHaveLength(1);
});

test("rejects public outputs that overwrite Lucid assets or escape the output directory", async () => {
	await write("assets/index.html", "content");
	for (const output of [
		"lucid",
		"../outside",
		"/absolute",
		"brand/../../outside",
		"brand/../lucid",
	])
		await expect(
			prepareResources(
				{ sources: { public: [{ input: "./assets", output }] } },
				root,
			),
		).rejects.toThrow("invalid or reserved");
});

test.each([
	"ts",
	"mts",
	"js",
	"mjs",
])("reloads %s dependencies and recovers after an invalid default export", async (extension) => {
	await write("package.json", '{"type":"module"}');
	await write(`helper.${extension}`, 'export const url = "/before";');
	await write(
		`src/lucid/routes/route.${extension}`,
		`import { url } from "../../../helper.${extension}"; export default { method: "get", path: url, handler: () => new Response() };`,
	);
	expect(
		(await prepareResources({}, root)).config.http?.routes?.[0]?.path,
	).toBe("/before");
	await write(`helper.${extension}`, 'export const url = "/after";');
	expect(
		(await prepareResources({}, root)).config.http?.routes?.[0]?.path,
	).toBe("/after");
	await write(`src/lucid/routes/route.${extension}`, "export default null;");
	await expect(prepareResources({}, root)).rejects.toThrow("Invalid routes");
	await write(`src/lucid/routes/route.${extension}`, route("/fixed"));
	expect(
		(await prepareResources({}, root)).config.http?.routes?.[0]?.path,
	).toBe("/fixed");
});

test("maps a single public file to its exact output filename", async () => {
	await write("assets/icon.svg", "icon");
	const result = await prepareResources(
		{
			sources: {
				public: [{ input: "./assets/icon.svg", output: "brand/logo.svg" }],
			},
		},
		root,
	);
	expect(result.resources.files.public[0]?.name).toBe("brand/logo.svg");
});

test("checks normalized destinations for mapped public files", async () => {
	await write("assets/icon.svg", "icon");
	for (const output of [
		"brand/../../outside.svg",
		"brand/../lucid/index.html",
	]) {
		await expect(
			prepareResources(
				{ sources: { public: [{ input: "./assets/icon.svg", output }] } },
				root,
			),
		).rejects.toThrow("invalid or reserved");
	}
});

const table = (
	name: string,
) => `import { defineTable, z } from ${JSON.stringify(import.meta.resolve("@lucidcms/core"))};
export default defineTable(${JSON.stringify(name)}, {columns: {title: {schema: z.string(), type: "text"}}});`;

test("discovers nested table definitions and ignores named helper exports", async () => {
	const file = await write(
		"src/lucid/tables/nested/events.ts",
		table("events"),
	);
	await write("src/lucid/tables/helpers.ts", "export const helper = true;");
	const result = await prepareResources({}, root);
	expect(result.config.tables?.map((value) => value.name)).toEqual(["events"]);
	expect(result.resources.modules.tables).toEqual([file]);
});

test("table discovery can be disabled while plugin sources and manual definitions stay registered", async () => {
	await write("src/lucid/tables/disabled.ts", 'throw new Error("Disabled");');
	await write("shared/events.mjs", table("events"));
	const { defineTable, z } = await import("@lucidcms/core");
	const manual = defineTable<{ title: string }>("manual", {
		columns: { title: { schema: z.string(), type: "text" } },
	});
	const result = await prepareResources(
		{
			discovery: { tables: false },
			tables: [manual],
			plugins: [
				{
					key: "tables",
					lucid: "*",
					sources: { tables: ["./shared"] },
					configure: () => {},
				},
			],
		},
		root,
	);
	expect(result.config.tables?.map((value) => value.name)).toEqual([
		"manual",
		"events",
	]);
});

test("rejects invalid table exports and reports duplicate table origins", async () => {
	const file = await write(
		"src/lucid/tables/invalid.ts",
		'export default {name: "events"};',
	);
	await expect(prepareResources({}, root)).rejects.toThrow(
		/Invalid tables.*invalid.ts/,
	);
	await rm(file);
	await write("src/lucid/tables/first.ts", table("events"));
	await write("src/lucid/tables/second.ts", table("events"));
	await expect(prepareResources({}, root)).rejects.toThrow(
		/Duplicate tables.*first.ts.*second.ts/,
	);
});

test("loads resource types concurrently with shared module instances", async () => {
	await write("signal.mjs", "export const ready = Promise.withResolvers();");
	await write(
		"src/lucid/routes/wait.mjs",
		`import { ready } from "../../../signal.mjs";
await ready.promise;
${route("/ready")}`,
	);
	await write(
		"src/lucid/hooks/signal.mjs",
		`import { ready } from "../../../signal.mjs";
ready.resolve();
export default { service: "documents", event: "afterFetch", handler: async () => ({data: undefined, error: undefined}) };`,
	);

	const result = await prepareResources({}, root);
	expect(result.config.http?.routes?.[0]?.path).toBe("/ready");
	expect(result.config.hooks).toHaveLength(1);
});

test("finishes pending resource imports before cleaning up a failed load", async () => {
	await write("src/lucid/routes/invalid.mjs", "export default null;");
	await write(
		"src/lucid/hooks/slow.mjs",
		`import { writeFile } from "node:fs/promises";
await new Promise(resolve => setTimeout(resolve, 25));
await writeFile(new URL("../../../finished.txt", import.meta.url), "finished");
export default { service: "documents", event: "afterFetch", handler: async () => ({data: undefined, error: undefined}) };`,
	);

	await expect(prepareResources({}, root)).rejects.toThrow("Invalid routes");
	expect(await readFile(path.join(root, "finished.txt"), "utf8")).toBe(
		"finished",
	);
	await write("src/lucid/routes/invalid.mjs", route("/fixed"));
	expect(
		(await prepareResources({}, root)).config.http?.routes?.[0]?.path,
	).toBe("/fixed");
});
