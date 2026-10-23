import { readFile } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import { normalizePath, type Plugin } from "vite";
import { PLUGIN_KEY } from "../../constants.js";
import isInside from "../../utils/is-inside.js";
import componentPatterns from "../ui/component-patterns.js";
import listSiteComponents from "./list-site-components.js";
import renderSiteModule from "./render-site-module.js";
import type { SiteViteContext } from "./types.js";

/** The site's server module, whose exports reach runtime code as `pluginModules`. */
export const SITE_MODULE_ID = "virtual:lucid/plugin-site";
export const RESOLVED_SITE_MODULE_ID = `\0${SITE_MODULE_ID}`;
/** Imports a template as its source, through a module that accepts its own updates. */
const TEMPLATE_QUERY = "?lucid-site-template";

/** Serves templates and UI components through Vite's server environment, listing all components in development and embedding client build data in production, with the site inside Vite's root. */
const siteModulePlugin = (context: SiteViteContext): Plugin => ({
	name: "lucid:site",
	config(config) {
		context.viteRoot = path.resolve(config.root ?? process.cwd());
		if (!isInside(context.viteRoot, context.root)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `The site directory '${context.root}' must be inside the Vite root '${context.viteRoot}', which serves its files.`,
			});
		}

		const relative = path.relative(context.viteRoot, context.root);
		context.prefix = relative === "" ? "" : `${normalizePath(relative)}/`;
	},
	resolveId: {
		filter: { id: /^virtual:lucid\/plugin-site$/ },
		handler: () => RESOLVED_SITE_MODULE_ID,
	},
	load: {
		filter: {
			id: [/^\0virtual:lucid\/plugin-site$/, /\?lucid-site-template$/],
		},
		async handler(id) {
			if (id.endsWith(TEMPLATE_QUERY)) {
				const source = await readFile(
					id.slice(0, -TEMPLATE_QUERY.length),
					"utf8",
				);
				return `export default ${JSON.stringify(source)};\nif (import.meta.hot) import.meta.hot.accept();\n`;
			}

			const base = `/${context.prefix}`;
			const renderers = (names?: ReadonlySet<string>) =>
				(context.ui?.list ?? [])
					.filter((integration) => !names || names.has(integration.name))
					.map(({ name, server }) => ({ name, server }));

			if (this.environment.mode === "dev") {
				return renderSiteModule({
					data: {
						kind: "dev",
						prefix: context.prefix,
						revision: crypto.randomUUID().slice(0, 8),
					},
					base,
					templateQuery: TEMPLATE_QUERY,
					components: await listSiteComponents(context),
					renderers: renderers(),
					// `import.meta.glob` patterns start from the Vite root.
					componentGlobs: componentPatterns(context.extensions).map(
						(pattern) => `/${context.prefix}${pattern}`,
					),
				});
			}

			if (!context.clientBuild) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message:
						"The site's server module needs the client build's output. Build with Lucid's Vite plugin, which builds the client first.",
				});
			}

			const components = [...context.clientBuild.components].map(
				([name, integration]) => ({ name, integration }),
			);

			return renderSiteModule({
				data: context.clientBuild.data,
				base,
				templateQuery: TEMPLATE_QUERY,
				components,
				renderers: renderers(
					new Set(components.map(({ integration }) => integration)),
				),
			});
		},
	},
});

export default siteModulePlugin;
