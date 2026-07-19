import fs from "node:fs/promises";
import { findPackageJSON } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LucidError } from "../errors/index.js";

/**
 * Treats a missing source directory as optional project configuration,
 * while still allowing other filesystem/read errors to surface later.
 */
export const pathExists = async (targetPath: string) => {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
};

/**
 * Resolves a package source from the project that owns the Lucid config. Node's
 * `import.meta.resolve` is relative to this core module, which can point at a
 * different `node_modules` tree in nested workspace installs.
 */
const resolveProjectPackagePath = async (
	source: string,
	projectRoot: string,
) => {
	const sourceParts = source.split("/");
	const packageNamePartCount = source.startsWith("@") ? 2 : 1;
	if (sourceParts.length <= packageNamePartCount) return undefined;

	let packageJsonPath: string | undefined;
	try {
		packageJsonPath = findPackageJSON(
			source,
			pathToFileURL(path.join(projectRoot, "package.json")),
		);
	} catch {
		return undefined;
	}
	if (!packageJsonPath) return undefined;

	const sourcePath = path.join(
		path.dirname(packageJsonPath),
		...sourceParts.slice(packageNamePartCount),
	);
	return (await pathExists(sourcePath)) ? sourcePath : undefined;
};

/**
 * Converts source strings, package specifiers, and file URLs into absolute
 * filesystem paths. Project config may use relative strings; plugins can use
 * exported package subpaths such as `@scope/plugin/translations`.
 */
export const resolveSourcePath = async (
	source: string | URL,
	options?: {
		projectRoot?: string;
		/**
		 * Used in error messages to describe the source type. Eg. `Translation`, `Migration`.
		 */
		label?: string;
	},
) => {
	if (source instanceof URL) return fileURLToPath(source);
	if (path.isAbsolute(source)) return source;

	const projectRoot = options?.projectRoot ?? process.cwd();
	const projectPath = path.join(projectRoot, source);
	if (await pathExists(projectPath)) return projectPath;
	if (
		source.startsWith(".") ||
		(!source.startsWith("@") && !source.includes("/"))
	) {
		return projectPath;
	}

	try {
		const projectPackagePath = await resolveProjectPackagePath(
			source,
			projectRoot,
		);
		if (projectPackagePath) return projectPackagePath;

		const resolved = import.meta.resolve(source);
		const resolvedUrl = new URL(resolved);

		if (resolvedUrl.protocol !== "file:") {
			throw new Error(`Expected a file URL but received "${resolved}".`);
		}

		return fileURLToPath(resolvedUrl);
	} catch (error) {
		throw new LucidError({
			message: `${options?.label ?? "Source"} package specifier "${source}" could not be resolved.`,
			data: {
				error: error instanceof Error ? error.message : error,
			},
		});
	}
};
