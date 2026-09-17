import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import type {
	AdminConfig,
	AdminModulePath,
} from "../../extensions/types/config.js";
import { generateAssets, generateRegistry } from "./generate-modules.js";

const registryId = "virtual:lucid-admin";
const assetsId = "virtual:lucid-admin-assets";

export const hasAdminExtensions = (admin: AdminConfig = {}) =>
	[admin.routes, admin.slots, admin.scripts, admin.stylesheets].some(
		(entries) => entries && entries.length > 0,
	);

/** Resolves extension paths from the loaded config using Vite's browser conditions. */
export const adminExtensionsPlugin = (options: {
	configPath: string;
	admin?: AdminConfig;
}): Plugin => {
	const { configPath, admin = {} } = options;
	const configDirectory = path.dirname(configPath);
	let registry = "";
	let assets: Awaited<ReturnType<typeof generateAssets>> = {
		code: "",
		tags: [],
	};

	return {
		name: "lucid:admin-extensions",
		async buildStart() {
			const resolve = async (reference: AdminModulePath, label: string) => {
				const source =
					typeof reference === "string" ? reference : fileURLToPath(reference);
				const specifier = source.startsWith(".")
					? path.resolve(configDirectory, source)
					: source;

				// Resolve from the host config, not the installed admin package or CWD.
				// Vite follows package exports and node_modules at each ancestor level.
				const resolved = await this.resolve(specifier, configPath, {
					skipSelf: true,
				});
				if (!resolved || resolved.external) {
					throw new Error(
						`Admin ${label}: could not resolve "${source}" from "${configPath}".`,
					);
				}

				return resolved.id;
			};

			registry = await generateRegistry(admin, resolve);
			assets = await generateAssets(admin, resolve);
		},
		resolveId(id) {
			if (id === registryId || id === assetsId) return `\0${id}`;
		},
		load(id) {
			if (id === `\0${registryId}`) return registry;
			if (id === `\0${assetsId}`) return assets.code;
		},
		transformIndexHtml: { order: "pre", handler: () => assets.tags },
	};
};
