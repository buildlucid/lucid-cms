import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AdminClientConfig } from "../types/client-config.js";

const lockfiles = [
	"package-lock.json",
	".package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"bun.lock",
	"bun.lockb",
];

/** Includes workspace lockfiles as well as locks beside an installed project. */
const findLockfiles = async (root: string) => {
	const files: string[] = [];
	let directory = path.resolve(root);
	while (true) {
		const entries = await readdir(directory);
		for (const name of lockfiles) {
			if (entries.includes(name)) files.push(path.join(directory, name));
		}
		const parent = path.dirname(directory);
		if (parent === directory) return files;
		directory = parent;
	}
};

/** Hashes every admin input; without a dependency lockfile we rebuild each time. */
export const getAdminBuildKey = async (
	adminRoot: string,
	projectRoot: string,
	clientConfig: AdminClientConfig,
) => {
	const locks = [
		...new Set(
			(
				await Promise.all([
					findLockfiles(adminRoot),
					findLockfiles(projectRoot),
				])
			).flat(),
		),
	];
	if (locks.length === 0) return undefined;

	const directories = ["src", "dist/build", "dist/shared"];
	const sources = (
		await Promise.all(
			directories.map(async (directory) => {
				const root = path.join(adminRoot, directory);
				const entries = await readdir(root, {
					recursive: true,
					withFileTypes: true,
				});
				return entries
					.filter((entry) => entry.isFile())
					.map((entry) => path.join(entry.parentPath, entry.name));
			}),
		)
	).flat();

	const files = [
		...sources,
		...locks,
		...["package.json", "index.html"].map((name) => path.join(adminRoot, name)),
	].sort();
	const hash = createHash("sha256");
	hash.update(JSON.stringify(clientConfig));

	for (const [index, content] of (
		await Promise.all(files.map((file) => readFile(file)))
	).entries()) {
		hash.update(JSON.stringify([files[index], content.length]));
		hash.update(content);
	}

	const environment = Object.entries(process.env)
		.filter(([name]) => name.startsWith("VITE_") || name === "NODE_ENV")
		.sort(([a], [b]) => a.localeCompare(b));

	hash.update(
		JSON.stringify([
			process.version,
			process.platform,
			process.arch,
			environment,
		]),
	);

	return hash.digest("hex");
};
