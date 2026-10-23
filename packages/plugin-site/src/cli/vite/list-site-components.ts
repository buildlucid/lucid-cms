import { glob } from "node:fs/promises";
import { normalizePath } from "vite";
import componentPatterns from "../ui/component-patterns.js";
import type { SiteViteContext } from "./types.js";

/** Lists every UI component file in the site directory, with its integration, for development. */
const listSiteComponents = async (context: SiteViteContext) => {
	const { ui } = context;
	if (!ui || context.extensions.length === 0) return [];

	const components: Array<{ name: string; integration: string }> = [];
	for await (const file of glob(componentPatterns(context.extensions), {
		cwd: context.root,
		exclude: ["**/node_modules/**"],
	})) {
		const name = normalizePath(file);
		const integration = ui.match(name);
		if (integration) components.push({ name, integration: integration.name });
	}

	return components.sort((a, b) => (a.name < b.name ? -1 : 1));
};

export default listSiteComponents;
