import { pathToFileURL } from "node:url";
import { resolveSourcePath } from "./resolve-source-path.js";

/** Imports a module resolved from the project with `resolveSourcePath` and returns its default export for the caller to check. */
const importDefaultExport = async (
	source: string,
	options: { projectRoot: string; label: string },
): Promise<unknown> => {
	const modulePath = await resolveSourcePath(source, options);
	const imported: unknown = await import(pathToFileURL(modulePath).href);
	return typeof imported === "object" &&
		imported !== null &&
		"default" in imported
		? imported.default
		: undefined;
};

export default importDefaultExport;
