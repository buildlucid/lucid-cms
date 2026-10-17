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
			`database/seeds/nested/${extension}.${extension}`,
			'throw new Error("Command only");',
		);
	for (const file of [
		"bad.test.ts",
		"bad.spec.mjs",
		"bad.d.ts",
		"__tests__/bad.ts",
		"bad.cjs",
	])
		await write(`database/seeds/${file}`, "");
	await write("database/migrations/1751400000000-example.ts", "");
	const result = await prepareResources({}, root);
	expect(result.files.seeds.map((file) => file.name)).toEqual([
		"nested/js.js",
		"nested/mjs.mjs",
		"nested/mts.mts",
		"nested/ts.ts",
	]);
	expect(result.files.migrations).toHaveLength(1);
	expect(result.watch).toContain(path.join(root, "emails"));
});

test("disabling a project directory preserves plugin sources", async () => {
	const pluginFile = await write("plugin/en.admin.json", "{}");
	await write("translations/en.admin.json", "{}");
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
	await write("emails/default.mustache", "default");
	const result = await prepareResources(
		{ directories: { emails: "./custom" } },
		root,
	);
	expect(result.files.emails.map((file) => file.path)).toEqual([custom]);
	await expect(
		prepareResources({ directories: { emails: "./missing" } }, root),
	).rejects.toThrow("could not be read");
});

test("preserves source precedence and nested names for data and public resources", async () => {
	await write("plugin/emails/account/welcome.mustache", "plugin");
	await write("project/emails/account/welcome.mustache", "project source");
	await write("emails/account/welcome.mustache", "project directory");
	await write("assets/icons/logo.svg", "logo");
	const result = await prepareResources(
		{
			plugins: [
				{
					key: "example",
					lucid: "*",
					sources: { emails: ["./plugin/emails"] },
					configure: () => {},
				},
			],
			sources: {
				emails: ["./project/emails"],
				public: [{ input: "./assets", output: "brand" }],
			},
		},
		root,
	);
	expect(result.files.emails.map((file) => file.name)).toEqual(
		Array(3).fill("account/welcome.mustache"),
	);
	expect(result.files.public[0]?.name).toBe("brand/icons/logo.svg");
});

test("deduplicates linked sources and terminates symlink loops", async () => {
	const file = await write("shared/welcome.mustache", "shared");
	await symlink(path.join(root, "shared"), path.join(root, "emails"));
	await symlink(path.join(root, "shared"), path.join(root, "shared/loop"));
	const result = await prepareResources(
		{ sources: { emails: [pathToFileURL(file)] } },
		root,
	);
	expect(result.files.emails.map((entry) => entry.path)).toEqual([file]);
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
		"admin/index.html",
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

test("keeps the _lucid public folder for plugins", async () => {
	await write("assets/icon.svg", "icon");
	await expect(
		prepareResources(
			{
				sources: {
					public: [{ input: "./assets/icon.svg", output: "_lucid/icon.svg" }],
				},
			},
			root,
		),
	).rejects.toThrow("invalid or reserved");

	const result = await prepareResources(
		{
			plugins: [
				{
					key: "plugin-example",
					lucid: "*",
					sources: {
						public: [
							{
								input: path.join(root, "assets/icon.svg"),
								output: "_lucid/plugin-example/icon.svg",
							},
						],
					},
				},
			],
		},
		root,
	);
	expect(result.files.public.map((file) => file.name)).toContain(
		"_lucid/plugin-example/icon.svg",
	);
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
