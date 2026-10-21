import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin, PluginOption } from "vite";
import type { UiVite } from "../../ui/types.js";
import {
	ELEMENT_ID,
	hydrationName,
	readElementScript,
} from "./hydration-modules.js";
import type { ResolvedIntegrations } from "./resolve-integrations.js";

/** Creates integration and hydration plugins that import components and their `client` modules, serving `<client-component>` through Vite in development while builds copy its script. */
const uiVitePlugins = async (props: {
	root: string;
	integrations: ResolvedIntegrations;
}): Promise<PluginOption[]> => {
	const hydration: Plugin = {
		name: "lucid:client-component",
		resolveId: (id) =>
			id === ELEMENT_ID || hydrationName(id) !== null ? id : undefined,
		load: async (id) => {
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
	};
	// Plugins match globs against absolute paths, so the site directory is joined on.
	const root = props.root.split(path.sep).join("/");
	const absolute = (globs: string[] | undefined) =>
		globs?.map((glob) => path.posix.join(root, glob));
	// Resolved from the site, as Vite resolves integrations' other modules, so it finds the project's own install.
	const resolve = createRequire(path.join(props.root, "package.json")).resolve;
	const own = await Promise.all(
		props.integrations.list.map(async ({ vite, filter }) => {
			if (!vite) return [];
			const module: { default: UiVite } = await import(
				pathToFileURL(resolve(vite)).href
			);
			// Typed loosely in the public options, so the site plugin's types don't need Vite installed.
			return (await module.default({
				include: absolute(filter.include),
				exclude: absolute(filter.exclude),
			})) as PluginOption[];
		}),
	);
	return [hydration, ...own.flat()];
};

export default uiVitePlugins;
