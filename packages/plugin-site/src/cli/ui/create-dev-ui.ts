import { existsSync } from "node:fs";
import path from "node:path";
import type { EnvironmentModuleNode, ViteDevServer } from "vite";
import { ASSETS_BASE } from "../../constants.js";
import type { SiteUi } from "../../ui/site-ui.js";
import type { UiRenderer } from "../../ui/types.js";
import { ELEMENT_ID, hydrationId } from "./hydration-modules.js";
import type { ResolvedIntegrations } from "./resolve-integrations.js";

const STYLESHEET = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(\?|$)/;

/** The URLs of every stylesheet a module imports, directly or not, for Vite to serve. */
const stylesheetsOf = (module: EnvironmentModuleNode | undefined) => {
	const urls = new Set<string>();
	const seen = new Set<EnvironmentModuleNode>();
	const visit = (node: EnvironmentModuleNode) => {
		if (seen.has(node)) return;
		seen.add(node);
		if (STYLESHEET.test(node.url)) urls.add(ASSETS_BASE + node.url.slice(1));
		for (const imported of node.importedModules) visit(imported);
	};
	if (module) visit(module);
	return [...urls];
};

/** Loads components and renderers through Vite's server runner to share libraries and reload changes, exposing `rendersOnServer` for pages that render affected components without hydration. */
const createDevUi = (props: {
	server: ViteDevServer;
	root: string;
	integrations: ResolvedIntegrations;
	createRunner: typeof import("vite").createServerModuleRunner;
}): SiteUi & { rendersOnServer: (file: string) => boolean } => {
	const environment = props.server.environments.ssr;
	const runner = props.createRunner(environment);
	const serverOnly = new Set<string>();
	return {
		rendersOnServer: (file) => {
			const seen = new Set<EnvironmentModuleNode>();
			const stack = [...(environment.moduleGraph.getModulesByFile(file) ?? [])];
			for (let node = stack.pop(); node; node = stack.pop()) {
				if (seen.has(node)) continue;
				seen.add(node);
				if (node.file && serverOnly.has(node.file)) return true;
				stack.push(...node.importers);
			}
			return false;
		},
		script: ASSETS_BASE + ELEMENT_ID.slice(1),
		find: (name) => {
			const integration = props.integrations.match(name);
			const file = path.resolve(props.root, name);
			if (!integration || !existsSync(file)) return null;
			return {
				load: async ({ hydrate }) => {
					if (!hydrate) serverOnly.add(file);
					const [component, renderer]: [
						{ default: unknown },
						{ default: UiRenderer },
					] = await Promise.all([
						runner.import(file),
						runner.import(integration.server),
					]);
					return { component: component.default, renderer: renderer.default };
				},
				assets: () => ({
					src: ASSETS_BASE + hydrationId(name).slice(1),
					// Vite serves modules one by one, so there is nothing to preload.
					preload: [],
					css: stylesheetsOf(environment.moduleGraph.getModuleById(file)),
				}),
			};
		},
	};
};

export default createDevUi;
