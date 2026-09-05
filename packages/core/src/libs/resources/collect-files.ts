import type { Dirent, Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { LucidError } from "../../utils/errors/index.js";
import type { ResourceFile } from "./types.js";

export const moduleExtensions = new Set([".ts", ".mts", ".js", ".mjs"]);
const excludedDirectories = new Set([
	"node_modules",
	".git",
	"__tests__",
	"__mocks__",
]);

export const isResourceModule = (file: string) =>
	moduleExtensions.has(path.extname(file)) &&
	!/(?:\.d|\.test|\.spec)\.(?:ts|mts|js|mjs)$/.test(file);

/** Collects one source recursively, following workspace links once and retaining relative asset names. */
export const collectResourceFiles = async (
	source: string,
	options: {
		optional?: boolean;
		modules?: boolean;
		onDirectory?: (path: string) => void;
	} = {},
): Promise<ResourceFile[]> => {
	let stat: Awaited<ReturnType<typeof fs.stat>>;
	try {
		stat = await fs.stat(source);
	} catch (error) {
		if (
			options.optional &&
			error instanceof Error &&
			"code" in error &&
			error.code === "ENOENT"
		)
			return [];
		throw new LucidError({
			message: `Resource source "${source}" could not be read.`,
			data: { error },
		});
	}
	const root = stat.isDirectory() ? source : path.dirname(source);
	const visited = new Set<string>();
	const files: ResourceFile[] = [];
	const visit = async (
		entry: string,
		knownInfo?: Dirent | Stats,
	): Promise<void> => {
		const real = await fs.realpath(entry);
		if (visited.has(real)) return;
		visited.add(real);
		const info =
			knownInfo && !knownInfo.isSymbolicLink()
				? knownInfo
				: await fs.stat(real);
		if (info.isDirectory()) {
			options.onDirectory?.(real);
			const children = await fs.readdir(entry, { withFileTypes: true });
			children.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
			for (const child of children) {
				if (
					options.modules &&
					(excludedDirectories.has(child.name) ||
						child.name.startsWith(".") ||
						(child.isFile() && !isResourceModule(child.name)))
				)
					continue;
				await visit(path.join(entry, child.name), child);
			}
		} else if (info.isFile() && (!options.modules || isResourceModule(entry))) {
			files.push({
				path: real,
				name: path.relative(root, entry).split(path.sep).join("/"),
			});
		}
	};
	await visit(source, stat);
	return files;
};
