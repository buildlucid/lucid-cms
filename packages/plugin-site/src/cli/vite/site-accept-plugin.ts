import path from "node:path";
import { normalizePath, type Plugin } from "vite";
import type { SiteViteContext } from "./types.js";

/** Lets compiled server components accept updates, reloading their pages without restarting the server. */
const siteAcceptPlugin = (context: SiteViteContext): Plugin => ({
	name: "lucid:site-accept",
	apply: "serve",
	enforce: "post",
	applyToEnvironment: (environment) => environment.config.consumer === "server",
	transform: {
		// Site files without a query, as Vite's module IDs write them.
		filter: {
			id: new RegExp(`^${RegExp.escape(normalizePath(context.root))}/[^?]+$`),
		},
		handler(code, id) {
			if (!context.ui?.match(normalizePath(path.relative(context.root, id)))) {
				return;
			}

			return {
				code: `${code}\nif (import.meta.hot) import.meta.hot.accept();\n`,
				map: null,
			};
		},
	},
});

export default siteAcceptPlugin;
