import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

	const projectPath = path.join(options?.projectRoot ?? process.cwd(), source);
	if (await pathExists(projectPath)) return projectPath;
	if (
		source.startsWith(".") ||
		(!source.startsWith("@") && !source.includes("/"))
	) {
		return projectPath;
	}

	try {
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
