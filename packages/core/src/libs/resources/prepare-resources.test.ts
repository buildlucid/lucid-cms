import {
	mkdir,
	mkdtemp,
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
beforeEach(async () => {
	root = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "lucid-resources-")),
	);
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

test("collects nested modules without importing them and ignores tests, declarations and unsupported extensions", async () => {
	for (const extension of ["ts", "mts", "js", "mjs"])
		await write(
			`lucid/seeds/nested/${extension}.${extension}`,
			'throw new Error("Command only");',
		);
	for (const file of [
		"bad.test.ts",
		"bad.spec.mjs",
		"bad.d.ts",
		"__tests__/bad.ts",
		"bad.cjs",
	])
		await write(`lucid/seeds/${file}`, "");
	await write("lucid/migrations/1751400000000-example.ts", "");
	const result = await prepareResources({}, root);
	expect(result.files.seeds.map((file) => file.name)).toEqual([
		"nested/js.js",
		"nested/mjs.mjs",
		"nested/mts.mts",
		"nested/ts.ts",
	]);
	expect(result.files.migrations).toHaveLength(1);
	expect(result.watch).toContain(path.join(root, "lucid/templates"));
});

test("disabling a project directory preserves plugin sources", async () => {
	const pluginFile = await write("plugin/en.admin.json", "{}");
	await write("lucid/translations/en.admin.json", "{}");
	const result = await prepareResources(
		{
			directories: { translations: false },
			plugins: [
				{
					key: "example",
					lucid: "*",
					sources: { translations: [pathToFileURL(path.dirname(pluginFile))] },
					configure: () => {},
				},
			],
		},
		root,
	);
	expect(result.files.translations.map((file) => file.path)).toEqual([
		pluginFile,
	]);
});

test("replaces a default directory and rejects missing configured directories", async () => {
	const custom = await write("custom/welcome.mustache", "custom");
	await write("lucid/templates/default.mustache", "default");
	const result = await prepareResources(
		{ directories: { templates: "./custom" } },
		root,
	);
	expect(result.files.templates.map((file) => file.path)).toEqual([custom]);
	await expect(
		prepareResources({ directories: { templates: "./missing" } }, root),
	).rejects.toThrow("could not be read");
});

test("preserves source precedence and nested names for data and public resources", async () => {
	await write("plugin/templates/account/welcome.mustache", "plugin");
	await write("project/templates/account/welcome.mustache", "project source");
	await write("lucid/templates/account/welcome.mustache", "project directory");
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
	expect(result.files.templates.map((file) => file.name)).toEqual(
		Array(3).fill("account/welcome.mustache"),
	);
	expect(result.files.public[0]?.name).toBe("brand/icons/logo.svg");
});

test("deduplicates linked sources and terminates symlink loops", async () => {
	const file = await write("shared/welcome.mustache", "shared");
	await mkdir(path.join(root, "lucid"), { recursive: true });
	await symlink(path.join(root, "shared"), path.join(root, "lucid/templates"));
	await symlink(path.join(root, "shared"), path.join(root, "shared/loop"));
	const result = await prepareResources(
		{ sources: { templates: [pathToFileURL(file)] } },
		root,
	);
	expect(result.files.templates.map((entry) => entry.path)).toEqual([file]);
});

test("resolves exported package directories from the owning project and refuses private paths", async () => {
	await write(
		"node_modules/@example/resources/package.json",
		JSON.stringify({
			name: "@example/resources",
			exports: { "./translations": { import: "./dist/translations" } },
		}),
	);
	const file = await write(
		"node_modules/@example/resources/dist/translations/en.admin.json",
		"{}",
	);
	const result = await prepareResources(
		{ sources: { translations: ["@example/resources/translations"] } },
		root,
	);
	expect(result.files.translations.map((entry) => entry.path)).toEqual([file]);
	await expect(
		resolveSourcePath("@example/resources/dist/translations", {
			projectRoot: root,
		}),
	).rejects.toThrow("could not be resolved");
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
	expect(result.files.public[0]?.name).toBe("brand/logo.svg");
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
