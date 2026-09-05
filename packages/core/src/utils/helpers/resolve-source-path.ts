import fs from "node:fs/promises";
import { findPackageJSON } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type PathConditions, resolveExports } from "resolve-pkg-maps";
import { LucidError } from "../errors/index.js";
import isPlainObject from "./is-plain-object.js";

/** Checks existence without suppressing permissions or other filesystem errors. */
export const pathExists = async (targetPath: string) => {
	try {
		await fs.access(targetPath);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT")
			return false;
		throw error;
	}
};

const isExportMap = (value: unknown): value is PathConditions => {
	if (typeof value === "string") return true;
	if (Array.isArray(value))
		return value.every((entry) => !Array.isArray(entry) && isExportMap(entry));
	return (
		isPlainObject(value) &&
		Object.values(value).every((entry) => entry === null || isExportMap(entry))
	);
};

/** Resolves project-relative paths and exported package resources from the project that owns lucid.config. */
export const resolveSourcePath = async (
	source: string | URL,
	options?: { projectRoot?: string; label?: string },
) => {
	if (source instanceof URL) return fileURLToPath(source);
	if (path.isAbsolute(source)) return source;
	const root = options?.projectRoot ?? process.cwd();
	if (source.startsWith(".")) return path.resolve(root, source);
	const local = path.resolve(root, source);
	if (await pathExists(local)) return local;
	try {
		const packageFile = findPackageJSON(
			source,
			pathToFileURL(path.join(root, "package.json")),
		);
		if (!packageFile) throw new Error("Package was not found");
		const json: unknown = JSON.parse(await fs.readFile(packageFile, "utf8"));
		if (!isPlainObject(json)) throw new Error("Invalid package.json");
		const parts = source.split("/");
		const subpath = parts.slice(source.startsWith("@") ? 2 : 1).join("/");
		if (!isExportMap(json.exports))
			throw new Error("Package has no valid exports map");
		const [target] = resolveExports(json.exports, subpath, ["node", "import"]);
		if (!target) throw new Error(`Package does not export "${subpath}"`);
		const resolved = path.resolve(path.dirname(packageFile), target);
		const relative = path.relative(path.dirname(packageFile), resolved);
		if (relative.startsWith("..") || path.isAbsolute(relative))
			throw new Error("Package export escapes its package");
		return resolved;
	} catch (error) {
		throw new LucidError({
			message: `${options?.label ?? "Resource source"} "${source}" could not be resolved from "${root}". Use ./ for relative paths or an exported package subpath.`,
			data: { error },
		});
	}
};
