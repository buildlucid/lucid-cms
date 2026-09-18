import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { getAdminBuildKey } from "./cache.js";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
	);
});

const fixture = async () => {
	const root = await mkdtemp(path.join(tmpdir(), "lucid-admin-key-"));
	roots.push(root);
	for (const directory of ["src/styles", "dist/build", "dist/shared"]) {
		await mkdir(path.join(root, directory), { recursive: true });
	}
	for (const file of [
		"src/index.tsx",
		"src/styles/theme.css",
		"dist/build/config.mjs",
		"dist/shared/preview.js",
		"package.json",
		"index.html",
	]) {
		await writeFile(path.join(root, file), file);
	}
	return root;
};

test("rebuilds without a dependency lockfile", async () => {
	const root = await fixture();
	expect(
		await getAdminBuildKey(root, root, { brand: { name: "Lucid" } }),
	).toBeUndefined();
});

test("invalidates source, compiler, shared helper and lockfile changes, including additions and removals", async () => {
	const root = await fixture();
	await writeFile(path.join(root, "package-lock.json"), "first lock");
	const original = await getAdminBuildKey(root, root, {
		brand: { name: "Lucid" },
	});
	expect(original).toBeTypeOf("string");
	await utimes(path.join(root, "src/index.tsx"), new Date(0), new Date(0));
	expect(await getAdminBuildKey(root, root, { brand: { name: "Lucid" } })).toBe(
		original,
	);
	let previous = original;
	for (const file of [
		"src/index.tsx",
		"src/styles/theme.css",
		"dist/build/config.mjs",
		"dist/shared/preview.js",
		"package-lock.json",
		"src/new.tsx",
	]) {
		await writeFile(path.join(root, file), "changed");
		const next = await getAdminBuildKey(root, root, {
			brand: { name: "Lucid" },
		});
		expect(next).not.toBe(previous);
		previous = next;
	}
	await rm(path.join(root, "src/new.tsx"));
	expect(
		await getAdminBuildKey(root, root, { brand: { name: "Lucid" } }),
	).not.toBe(previous);
});

test("invalidates builds when exposed config changes", async () => {
	const root = await fixture();
	await writeFile(path.join(root, "package-lock.json"), "lock");
	const key = await getAdminBuildKey(root, root, { brand: { name: "First" } });
	expect(
		await getAdminBuildKey(root, root, { brand: { name: "Second" } }),
	).not.toBe(key);
});
