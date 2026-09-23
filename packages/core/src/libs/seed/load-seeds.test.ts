import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { prepareResources } from "../resources/prepare-resources.js";
import loadSeeds from "./load-seeds.js";

let projectRoot: string;

beforeEach(async () => {
	projectRoot = await mkdtemp(path.join(os.tmpdir(), "lucid-seeds-"));
});

afterEach(async () => {
	await rm(projectRoot, { recursive: true, force: true });
});

test("loads project, package and namespaced inline seed sources", async () => {
	const packageRoot = path.join(
		projectRoot,
		"node_modules",
		"@example",
		"seeds",
	);
	const packageSeeds = path.join(packageRoot, "seeds");
	const projectSeeds = path.join(projectRoot, "lucid/seeds");

	await Promise.all([
		mkdir(packageSeeds, { recursive: true }),
		mkdir(projectSeeds, { recursive: true }),
	]);

	await Promise.all([
		writeFile(
			path.join(packageRoot, "package.json"),
			JSON.stringify({
				name: "@example/seeds",
				type: "module",
				exports: { "./seeds": "./seeds" },
			}),
		),
		writeFile(
			path.join(packageSeeds, "plugin-example.mjs"),
			"export default async () => {};",
		),
		writeFile(
			path.join(projectSeeds, "project-example.mjs"),
			"export default async () => {};",
		),
	]);

	const prepared = await prepareResources(
		{ sources: { seeds: ["@example/seeds/seeds"] } },
		projectRoot,
	);
	const seeds = await loadSeeds({
		files: prepared.files.seeds,
		definitions: [{ name: "pages:example", seed: async () => {} }],
	});

	expect(Object.keys(seeds).sort()).toEqual([
		"pages:example",
		"plugin-example",
		"project-example",
	]);
});
