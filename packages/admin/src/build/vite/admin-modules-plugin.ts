import { normalizePath, type Plugin } from "vite";
import { adminAliases, adminRoot } from "../config.js";

const cleanId = (id: string) => id.split("?", 1)[0] ?? id;
/** The admin's folder as Vite's module IDs write it, with forward slashes on every platform. */
const adminDirectory = `${normalizePath(adminRoot)}/`;

/** Replaces an admin alias at the start of a specifier, or returns undefined when none matches. */
const resolveAdminAlias = (source: string) => {
	for (const [find, replacement] of Object.entries(adminAliases)) {
		if (source === find || source.startsWith(`${find}/`)) {
			return replacement + source.slice(find.length);
		}
	}
};

/**
 * Follows the admin's imports, from its own source through its virtual modules to extension components,
 * so `isAdminModule` can scope the admin's compilers and aliases to that graph in a shared client environment.
 */
const createAdminModules = () => {
	const imported = new Set<string>();
	const isAdminModule = (id: string) => {
		const file = cleanId(id);
		return file.startsWith(adminDirectory) || imported.has(file);
	};

	const plugin: Plugin = {
		name: "lucid:admin-modules",
		enforce: "pre",
		applyToEnvironment: (environment) => environment.name === "client",
		async resolveId(source, importer, options) {
			if (!importer || !isAdminModule(importer)) return;

			// Options are passed on one by one, as Vite deprecates the `ssr` flag in favour of the environment.
			const resolved = await this.resolve(
				resolveAdminAlias(source) ?? source,
				importer,
				{
					kind: options.kind,
					custom: options.custom,
					isEntry: options.isEntry,
					skipSelf: true,
				},
			);
			if (resolved && !resolved.external) imported.add(cleanId(resolved.id));

			return resolved;
		},
	};

	return { plugin, isAdminModule };
};

export default createAdminModules;
