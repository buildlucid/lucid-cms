import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, expect, test } from "vitest";
import constants from "../../constants/constants.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import bundleServer from "./bundle-server.js";

const runtimeContext: AdapterRuntimeContext = {
	runtime: "test",
	host: "lucid",
	compiled: true,
	getConnectionInfo: () => ({}),
	buildModule: null,
};

let tempDir: string;
let configPath: string;
let outputPath: string;
let dataDirectory: string;

beforeEach(async () => {
	tempDir = await mkdtemp(path.join(tmpdir(), "lucid-bundle-server-"));
	configPath = path.join(tempDir, "lucid.config.ts");
	outputPath = path.join(tempDir, "dist");
	dataDirectory = path.join(outputPath, constants.build.directory);
	const { dataFiles } = constants.build;

	await mkdir(dataDirectory, { recursive: true });
	await Promise.all([
		writeFile(
			configPath,
			`const defineConfig = (definition) => definition;
const runtime = { key: "test" };

export default defineConfig({ runtime, db: "db", config: () => ({}) });
`,
		),
		writeFile(
			path.join(dataDirectory, dataFiles.translations),
			JSON.stringify({ en: {} }),
		),
		writeFile(path.join(dataDirectory, dataFiles.emailTemplates), "{}"),
		writeFile(
			path.join(dataDirectory, dataFiles.pluginData),
			JSON.stringify({ example: { routes: 2 } }),
		),
		writeFile(
			path.join(dataDirectory, dataFiles.pluginModules),
			"export default {};\n",
		),
	]);
});

afterEach(async () => {
	await rm(tempDir, { recursive: true, force: true });
});

test("inlines the built project and removes the files it was built from", async () => {
	await bundleServer({
		configPath,
		outputPath,
		build: {
			entries: {
				server: `import build from "${constants.build.moduleId}";\nexport default build;\n`,
			},
			runtimeContext,
		},
	});

	const { default: build } = await import(
		pathToFileURL(path.join(outputPath, "server.js")).href
	);

	expect(build.host.definition.runtime).toEqual({ key: "test" });
	expect(build.host.translationBundles).toEqual({ en: {} });
	expect(build.pluginData).toEqual({ example: { routes: 2 } });
	expect(existsSync(dataDirectory)).toBe(false);
});

test("loads external build data from the build output at runtime", async () => {
	await bundleServer({
		configPath,
		outputPath,
		build: {
			entries: {
				server: `import build from "${constants.build.moduleId}";\nexport default build;\n`,
				"lucid/build": `export { default } from "${constants.build.moduleId}";\n`,
			},
			bundle: { packages: "external", buildData: "external" },
			runtimeContext,
		},
	});

	const { default: build } = await import(
		pathToFileURL(path.join(dataDirectory, "build.js")).href
	);

	expect(build.pluginData).toEqual({ example: { routes: 2 } });
	expect(
		existsSync(path.join(dataDirectory, constants.build.dataFiles.pluginData)),
	).toBe(true);
	expect(existsSync(path.join(dataDirectory, "config.ts"))).toBe(false);
});

test("resolves aliases before leaving packages external", async () => {
	await writeFile(
		path.join(tempDir, "local.js"),
		`export const local = "local module";\n`,
	);

	await bundleServer({
		configPath,
		outputPath,
		build: {
			entries: {
				server: `export { local } from "local-alias";\nexport { z } from "package-alias";\n`,
			},
			bundle: {
				packages: "external",
				alias: {
					"local-alias": path.join(tempDir, "local.js"),
					"package-alias": "zod",
				},
			},
			runtimeContext,
		},
	});

	const output = await readFile(path.join(outputPath, "server.js"), "utf-8");
	expect(output).toContain("local module");
	expect(output).toMatch(/from\s*"zod"/);
	expect(output).not.toMatch(/"(local|package)-alias"/);
});
