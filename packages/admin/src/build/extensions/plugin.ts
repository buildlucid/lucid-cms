import path from "node:path";
import { fileURLToPath } from "node:url";
import { type HtmlTagDescriptor, normalizePath, type Plugin } from "vite";
import type {
	AdminConfig,
	AdminModulePath,
} from "../../extensions/types/config.js";
import { generateAssets, generateRegistry } from "./generate-modules.js";

const registryId = "virtual:lucid-admin";

type AdminExtensionsApi = {
	/** Remote script and stylesheet tags, resolved at build start. */
	tags: () => HtmlTagDescriptor[];
};

/** The extensions plugin, with an `api` for the admin's document renderers. */
export type AdminExtensionsPlugin = Plugin<AdminExtensionsApi> & {
	api: AdminExtensionsApi;
};

/** Resolves extension paths from the loaded config using Vite's browser conditions. */
export const adminExtensionsPlugin = (options: {
	configPath: string;
	stylesheetPath: string;
	admin?: AdminConfig;
}): AdminExtensionsPlugin => {
	const { configPath, admin = {} } = options;
	const configDirectory = path.dirname(configPath);
	const stylesheetPath = normalizePath(options.stylesheetPath);
	const componentDirectories = new Set<string>();
	let registry = "";
	let assets: Awaited<ReturnType<typeof generateAssets>> = {
		code: "",
		stylesheets: [],
		tags: [],
	};

	return {
		name: "lucid:admin-extensions",
		enforce: "pre",
		async buildStart() {
			componentDirectories.clear();

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

			registry = await generateRegistry(admin, async (reference, label) => {
				const id = await resolve(reference, label);
				const file = id.split("?", 1)[0];

				// Tailwind scans directories, not the component's import graph. Keep
				// each source local to its component rather than widening to a common root.
				if (path.isAbsolute(file)) {
					componentDirectories.add(normalizePath(path.dirname(file)));
				}

				return id;
			});

			assets = await generateAssets(admin, resolve);
		},
		resolveId: {
			filter: { id: /^virtual:lucid-admin(-assets)?$/ },
			handler: (id) => `\0${id}`,
		},
		load: {
			filter: { id: /^\0virtual:lucid-admin(-assets)?$/ },
			handler: (id) => (id === `\0${registryId}` ? registry : assets.code),
		},
		// Extend the real CSS entry before Tailwind runs. Imported files retain their
		// own base paths for @source, nested imports, assets and Vite's watcher.
		transform: {
			filter: { id: new RegExp(`^${RegExp.escape(stylesheetPath)}(\\?|$)`) },
			handler(source) {
				if (
					assets.stylesheets.length === 0 &&
					componentDirectories.size === 0
				) {
					return;
				}

				return {
					code: [
						source,
						...assets.stylesheets.map(
							(file) => `@import ${JSON.stringify(normalizePath(file))};`,
						),
						...Array.from(componentDirectories)
							.sort()
							.map((directory) => `@source ${JSON.stringify(directory)};`),
					].join("\n"),
					map: null,
				};
			},
		},
		api: { tags: () => assets.tags },
	};
};
