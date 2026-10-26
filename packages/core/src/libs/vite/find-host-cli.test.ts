import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import findHostCli from "./find-host-cli.js";

const roots: string[] = [];

/** Writes a project depending on `packages`, each installed with its own `package.json` and files. */
const createProject = async (
	packages: Record<
		string,
		{ manifest: object; files?: Record<string, string> }
	>,
) => {
	const root = await mkdtemp(path.join(os.tmpdir(), "lucid-host-"));
	roots.push(root);
	await writeFile(
		path.join(root, "package.json"),
		JSON.stringify({
			dependencies: Object.fromEntries(
				Object.keys(packages).map((name) => [name, "*"]),
			),
		}),
	);
	for (const [name, { manifest, files = {} }] of Object.entries(packages)) {
		const directory = path.join(root, "node_modules", name);
		await mkdir(directory, { recursive: true });
		await writeFile(
			path.join(directory, "package.json"),
			JSON.stringify({ name, ...manifest }),
		);
		for (const [file, source] of Object.entries(files)) {
			await writeFile(path.join(directory, file), source);
		}
	}
	return root;
};

afterEach(async () => {
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
	);
});

test("loads the CLI module a dependency names under lucid.host, and finds none otherwise", async () => {
	const hosted = await createProject({
		"other-package": { manifest: {} },
		"framework-lucid": {
			manifest: { lucid: { host: "./cli.mjs" } },
			files: {
				"cli.mjs":
					'export default { name: "Framework", commands: { dev: "fw dev", build: "fw build", preview: "fw preview" }, viteConfig: async () => ({}) };',
			},
		},
	});
	expect((await findHostCli(hosted))?.name).toBe("Framework");

	const standalone = await createProject({ "other-package": { manifest: {} } });
	expect(await findHostCli(standalone)).toBeUndefined();
});
