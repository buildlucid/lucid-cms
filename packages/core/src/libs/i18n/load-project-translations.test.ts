import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, test } from "vitest";
import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { collectResourceFiles } from "../resources/collect-files.js";
import { prepareResources } from "../resources/prepare-resources.js";
import { loadTranslationSources, prepareTranslations } from "./index.js";

let projectRoot: string;

beforeEach(async () => {
	projectRoot = await mkdtemp(path.join(os.tmpdir(), "lucid-i18n-"));
});

afterEach(async () => {
	await rm(projectRoot, { recursive: true, force: true });
});

test("loads translation sources from paths and URLs in runtime precedence order", async () => {
	const pluginSource = path.join(projectRoot, "plugin-translations");
	const userSource = path.join(projectRoot, "user-translations");
	const projectSource = path.join(projectRoot, "translations");

	await mkdir(pluginSource);
	await mkdir(userSource);
	await mkdir(projectSource);

	await writeFile(
		path.join(pluginSource, "en.server.json"),
		JSON.stringify({
			"test.order": "Plugin",
			"test.plugin": "Plugin only",
		}),
	);
	await writeFile(
		path.join(userSource, "en.server.json"),
		JSON.stringify({
			"test.order": "User",
			"test.user": "User only",
		}),
	);
	await writeFile(
		path.join(userSource, "fr.admin.json"),
		JSON.stringify({
			"test.label": "French user admin",
		}),
	);
	await writeFile(
		path.join(projectSource, "en.server.json"),
		JSON.stringify({
			"test.order": "Project",
			"test.project": "Project only",
		}),
	);

	const prepared = await prepareResources(
		{
			directories: { translations: "./translations" },
			sources: {
				translations: [pathToFileURL(pluginSource), "./user-translations"],
			},
		},
		projectRoot,
	);
	const bundles = await loadTranslationSources({
		files: prepared.files.translations,
	});

	expect(bundles.en.server["test.order"]).toBe("Project");
	expect(bundles.en.server["test.plugin"]).toBe("Plugin only");
	expect(bundles.en.server["test.user"]).toBe("User only");
	expect(bundles.en.server["test.project"]).toBe("Project only");
	expect(bundles.fr.admin["test.label"]).toBe("French user admin");
	expect(bundles.en.server["core.config.duplicate.keys"]).toBeUndefined();
});

test("loads a single translation file source", async () => {
	const sourceFile = path.join(projectRoot, "es.server.json");

	await writeFile(
		sourceFile,
		JSON.stringify({
			"test.file": "Single file",
		}),
	);

	const bundles = await loadTranslationSources({
		files: await collectResourceFiles(sourceFile),
	});

	expect(bundles.es.server["test.file"]).toBe("Single file");
});

test("loads translation sources from package subpath specifiers", async () => {
	const prepared = await prepareResources(
		{
			directories: { public: false },
			sources: { translations: ["@lucidcms/plugin-pages/translations"] },
		},
		process.cwd(),
	);
	const bundles = await loadTranslationSources({
		files: prepared.files.translations,
	});

	expect(bundles.en.admin["plugin.pages.fields.slug.label"]).toBe("Slug");
	expect(bundles.en.server["plugin.pages.fields.required.missing"]).toBe(
		"Cannot find required fields for the pages plugin.",
	);
});

test("loads package sources from the project node_modules tree", async () => {
	const packageRoot = path.join(
		projectRoot,
		"node_modules",
		"@example",
		"translations",
	);
	const sourceDirectory = path.join(packageRoot, "translations");
	await mkdir(sourceDirectory, { recursive: true });
	await writeFile(
		path.join(packageRoot, "package.json"),
		JSON.stringify({
			name: "@example/translations",
			type: "module",
			exports: {
				"./translations": "./translations",
			},
		}),
	);
	await writeFile(
		path.join(sourceDirectory, "en.server.json"),
		JSON.stringify({
			"test.project-package": "Project package",
		}),
	);

	const prepared = await prepareResources(
		{ sources: { translations: ["@example/translations/translations"] } },
		projectRoot,
	);
	const bundles = await loadTranslationSources({
		files: prepared.files.translations,
	});

	expect(bundles.en.server["test.project-package"]).toBe("Project package");
});

test("prepares a translation store and writes the build artifact", async () => {
	const source = path.join(projectRoot, "translations");
	const outputPath = path.join(projectRoot, ".lucid");

	await mkdir(source);
	await writeFile(
		path.join(source, "en.server.json"),
		JSON.stringify({
			"test.artifact": "Artifact copy",
		}),
	);

	const result = await prepareTranslations({
		config: {
			i18n: {
				defaultLocale: "en",
			},
		} as ResolvedLucidConfig,
		files: await collectResourceFiles(source),
		outputPath,
	});

	expect(
		result.translationStore.resolve({
			scope: "server",
			key: "test.artifact",
		}),
	).toBe("Artifact copy");

	const artifact = JSON.parse(
		await readFile(
			path.join(outputPath, constants.i18n.renderedOutput),
			"utf-8",
		),
	);
	expect(artifact.en.server["test.artifact"]).toBe("Artifact copy");
	expect(artifact.en.server["core.config.duplicate.keys"]).toBe(
		"Duplicate keys found for {{builder}} builder.",
	);
});
