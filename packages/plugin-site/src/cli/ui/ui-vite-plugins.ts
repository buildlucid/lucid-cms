import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin, PluginOption } from "vite";
import {
	CLIENT_COMPONENT_ID_PATTERN,
	ELEMENT_ID,
	hydrationName,
} from "../../ui/hydration-ids.js";
import type { UiVite } from "../../ui/types.js";
import componentPatterns from "./component-patterns.js";
import readElementScript from "./read-element-script.js";
import type { ResolvedIntegrations } from "./resolve-integrations.js";

/** Creates integration and hydration plugins restricted to site files, importing components and `client` modules while serving `<client-component>` through Vite in development and copying its script for builds. */
const uiVitePlugins = async (props: {
	root: string;
	projectRoot: string;
	integrations: ResolvedIntegrations;
}): Promise<PluginOption[]> => {
	const hydration: Plugin = {
		name: "lucid:client-component",
		resolveId: {
			filter: { id: CLIENT_COMPONENT_ID_PATTERN },
			handler: (id) => id,
		},
		load: {
			filter: { id: CLIENT_COMPONENT_ID_PATTERN },
			async handler(id) {
				// The element imports whichever module it is told to, which Vite can't follow.
				if (id === ELEMENT_ID) {
					return (await readElementScript()).replace(
						"import(",
						"import(/* @vite-ignore */ ",
					);
				}
				const name = hydrationName(id);
				if (name === null) return;
				const integration = props.integrations.match(name);
				if (!integration) return;
				return [
					// Imports run in order, so the preamble runs before the component loads.
					...(integration.preamble
						? [`import ${JSON.stringify(integration.preamble)};`]
						: []),
					`import Component from ${JSON.stringify(path.resolve(props.root, name))};`,
					`import hydrate from ${JSON.stringify(integration.client)};`,
					"export default (element, props, slots, context) => hydrate(element, Component, props, slots, context);",
				].join("\n");
			},
		},
	};
	// Plugins match globs against absolute paths, so the site directory is joined on.
	const root = props.root.split(path.sep).join("/");
	const absolute = (globs: string[] | undefined) =>
		globs?.map((glob) => path.posix.join(root, glob));
	// Resolved from the site, as Vite resolves integrations' other modules, so it finds the project's own install.
	const resolve = createRequire(path.join(props.root, "package.json")).resolve;
	const own = await Promise.all(
		props.integrations.list.map(async ({ vite, filter, extensions }) => {
			if (!vite) return [];
			const module: { default: UiVite } = await import(
				pathToFileURL(resolve(vite)).href
			);
			// Typed loosely in the public options, so the site plugin's types don't need Vite installed.
			return (await module.default(
				{
					// The project's Vite app holds other code too, such as the admin's own JSX, so integrations only compile
					// the site's files.
					include:
						absolute(filter.include) ?? absolute(componentPatterns(extensions)),
					exclude: absolute(filter.exclude),
				},
				{ projectRoot: props.projectRoot },
			)) as PluginOption[];
		}),
	);
	return [hydration, ...own.flat()];
};

export default uiVitePlugins;
