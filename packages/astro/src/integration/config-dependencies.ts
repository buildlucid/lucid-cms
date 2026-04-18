import fs from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const WATCHABLE_SOURCE_EXTENSIONS = [
	".ts",
	".tsx",
	".js",
	".jsx",
	".mts",
	".cts",
	".mjs",
	".cjs",
	".json",
] as const;

const IMPORT_SPECIFIER_PATTERN =
	/\b(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["'`]([^"'`]+)["'`]/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

/**
 * Astro only needs to watch real files, so this keeps the dependency walk from
 * following missing or directory-only paths.
 */
const fileExists = async (targetPath: string) => {
	try {
		const stats = await fs.stat(targetPath);
		return stats.isFile();
	} catch {
		return false;
	}
};

/**
 * Lucid configs often import `.js` specifiers from TypeScript source, so we
 * expand each import into the source-file candidates Astro should watch.
 */
const buildSourceCandidates = (resolvedPath: string): string[] => {
	const ext = path.extname(resolvedPath);

	if (!ext) {
		return [
			resolvedPath,
			...WATCHABLE_SOURCE_EXTENSIONS.map(
				(candidateExt) => `${resolvedPath}${candidateExt}`,
			),
			...WATCHABLE_SOURCE_EXTENSIONS.map((candidateExt) =>
				path.join(resolvedPath, `index${candidateExt}`),
			),
		];
	}

	if (ext === ".js") {
		return [
			resolvedPath,
			`${resolvedPath.slice(0, -ext.length)}.ts`,
			`${resolvedPath.slice(0, -ext.length)}.tsx`,
			`${resolvedPath.slice(0, -ext.length)}.jsx`,
		];
	}

	if (ext === ".mjs") {
		return [resolvedPath, `${resolvedPath.slice(0, -ext.length)}.mts`];
	}

	if (ext === ".cjs") {
		return [resolvedPath, `${resolvedPath.slice(0, -ext.length)}.cts`];
	}

	return [resolvedPath];
};

/**
 * Only local project imports matter for Astro restarts, so package imports and
 * anything outside the workspace are ignored here.
 */
const resolveLocalImport = async (
	importerPath: string,
	specifier: string,
): Promise<string | null> => {
	if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) {
		return null;
	}

	const absoluteSpecifierPath = path.isAbsolute(specifier)
		? path.resolve(specifier)
		: path.resolve(path.dirname(importerPath), specifier);

	for (const candidate of buildSourceCandidates(absoluteSpecifierPath)) {
		if (!(await fileExists(candidate))) {
			continue;
		}

		const resolvedCandidate = path.resolve(candidate);
		if (
			!resolvedCandidate.startsWith(PROJECT_ROOT) ||
			resolvedCandidate.includes(`${path.sep}node_modules${path.sep}`) ||
			resolvedCandidate.endsWith(".d.ts")
		) {
			return null;
		}

		return resolvedCandidate;
	}

	return null;
};

/**
 * A lightweight regex pass is enough here because we only need to discover
 * import specifiers, not transform the module.
 */
const extractImportSpecifiers = (source: string): string[] => {
	const specifiers = new Set<string>();

	for (const pattern of [IMPORT_SPECIFIER_PATTERN, DYNAMIC_IMPORT_PATTERN]) {
		pattern.lastIndex = 0;
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];
			if (specifier) {
				specifiers.add(specifier);
			}
		}
	}

	return Array.from(specifiers);
};

/**
 * Astro only watches files it knows about up front, so we walk the Lucid config
 * import graph ourselves and register those files to keep dev restarts aligned
 * with the CLI when collections, bricks or plugin modules change.
 */
export const collectConfigDependencies = async (
	entryPath: string,
): Promise<string[]> => {
	const visited = new Set<string>();
	const dependencies = new Set<string>();

	const visit = async (filePath: string): Promise<void> => {
		const absolutePath = path.resolve(filePath);
		if (visited.has(absolutePath)) {
			return;
		}

		visited.add(absolutePath);

		let source: string;
		try {
			source = await fs.readFile(absolutePath, "utf-8");
		} catch {
			return;
		}

		for (const specifier of extractImportSpecifiers(source)) {
			const resolvedDependency = await resolveLocalImport(
				absolutePath,
				specifier,
			);

			if (!resolvedDependency || visited.has(resolvedDependency)) {
				continue;
			}

			dependencies.add(resolvedDependency);
			await visit(resolvedDependency);
		}
	};

	await visit(entryPath);
	dependencies.delete(path.resolve(entryPath));

	return Array.from(dependencies);
};

export default collectConfigDependencies;
