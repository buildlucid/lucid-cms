import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import loadExternalMigrations from "./load-external-migrations.js";

let projectRoot: string;

beforeEach(async () => {
	projectRoot = await mkdtemp(path.join(os.tmpdir(), "lucid-migrations-"));
});

afterEach(async () => {
	await rm(projectRoot, { recursive: true, force: true });
});

test("loads package sources from the project node_modules tree", async () => {
	const packageRoot = path.join(
		projectRoot,
		"node_modules",
		"@example",
		"migrations",
	);
	const sourceDirectory = path.join(packageRoot, "migrations");
	await mkdir(sourceDirectory, { recursive: true });
	await writeFile(
		path.join(packageRoot, "package.json"),
		JSON.stringify({
			name: "@example/migrations",
			type: "module",
			exports: {
				"./migrations": "./migrations",
			},
		}),
	);
	await writeFile(
		path.join(sourceDirectory, "1751400000000-example.mjs"),
		"export default () => ({ up: async () => {}, down: async () => {} });",
	);

	const migrations = await loadExternalMigrations({
		projectRoot,
		sources: ["@example/migrations/migrations"],
	});

	expect(Object.keys(migrations)).toEqual(["1751400000000-example"]);
	expect(typeof migrations["1751400000000-example"]).toBe("function");
});
