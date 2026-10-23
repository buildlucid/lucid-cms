import path from "node:path";
import {
	type EnvironmentModuleNode,
	isCSSRequest,
	normalizePath,
	type Plugin,
	type ViteDevServer,
} from "vite";
import { CLOUDFLARE_RUNTIME, TEMPLATE_EXTENSION } from "../../constants.js";
import { COMPONENT_STYLES_PATH } from "../../ui/hydration-ids.js";
import isInside from "../../utils/is-inside.js";
import componentPatterns from "../ui/component-patterns.js";
import { RESOLVED_SITE_MODULE_ID } from "./site-module-plugin.js";
import type { SiteViteContext } from "./types.js";

/** The URLs of every stylesheet a module imports, directly or not, for Vite to serve. */
const stylesheetsOf = (modules: Iterable<EnvironmentModuleNode>) => {
	const urls = new Set<string>();
	const seen = new Set<EnvironmentModuleNode>();

	const visit = (node: EnvironmentModuleNode) => {
		if (seen.has(node)) return;
		seen.add(node);
		if (isCSSRequest(node.url)) urls.add(node.url);
		for (const imported of node.importedModules) visit(imported);
	};

	for (const module of modules) visit(module);

	return [...urls];
};

/** A file's modules in the server environments, which load site files to render them. */
const serverModulesOf = (server: ViteDevServer, file: string) => {
	// Vite's module graph keys files by forward-slash paths, which `path.resolve` doesn't give on Windows.
	const key = normalizePath(file);
	return Object.values(server.environments)
		.filter((environment) => environment.config.consumer === "server")
		.flatMap((environment) => [
			...(environment.moduleGraph.getModulesByFile(key) ?? []),
		]);
};

/** Whether a site file imports one of the modules, directly or not, such as a component's shared code or styles. */
const importedBySite = (
	root: string,
	modules: Iterable<EnvironmentModuleNode>,
) => {
	const seen = new Set<EnvironmentModuleNode>();
	const visit = (node: EnvironmentModuleNode): boolean => {
		if (seen.has(node)) return false;
		seen.add(node);

		for (const importer of node.importers) {
			if (importer.file && isInside(root, importer.file)) return true;
			if (visit(importer)) return true;
		}

		return false;
	};

	for (const module of modules) {
		if (visit(module)) return true;
	}

	return false;
};

/** Reloads development pages for template and server component edits, updates cache revisions for other site dependencies, including external imports, and reserves HMR for files loaded only in browsers. */
const siteDevPlugin = (context: SiteViteContext): Plugin => ({
	name: "lucid:site-dev",
	apply: "serve",
	configEnvironment(name) {
		// Workers pre-bundle dependencies when they start, but components and renderers load later, on demand.
		if (name === "client" || context.runtime !== CLOUDFLARE_RUNTIME) return;
		if (!context.ui) return;
		return {
			optimizeDeps: {
				entries: componentPatterns(context.extensions).map(
					(pattern) => `${context.prefix}${pattern}`,
				),
				include: context.ui.list.map((integration) => integration.server),
			},
		};
	},
	configureServer(server) {
		// A server-rendered component's stylesheets, collected from the server environment, which loaded it to render.
		server.middlewares.use(COMPONENT_STYLES_PATH, (request, response) => {
			const name = decodeURIComponent((request.url ?? "").slice(1));
			const modules = serverModulesOf(server, path.resolve(context.root, name));

			response.setHeader("Content-Type", "text/css; charset=utf-8");
			response.end(
				stylesheetsOf(modules)
					.map((url) => `@import url(${JSON.stringify(url)});`)
					.join("\n"),
			);
		});
	},
	hotUpdate({ file, modules, server }) {
		const rendered = serverModulesOf(server, file);
		if (
			!isInside(context.root, file) &&
			!importedBySite(context.root, rendered)
		) {
			return;
		}

		if (this.environment.config.consumer === "server") {
			const siteModule = this.environment.moduleGraph.getModuleById(
				RESOLVED_SITE_MODULE_ID,
			);
			return file.endsWith(TEMPLATE_EXTENSION) || !siteModule
				? modules
				: [...modules, siteModule];
		}

		if (this.environment.name !== "client") return;

		if (file.endsWith(TEMPLATE_EXTENSION) || rendered.length > 0) {
			this.environment.hot.send({ type: "full-reload" });
			return [];
		}
	},
});

export default siteDevPlugin;
