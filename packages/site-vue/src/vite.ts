import { defineUiVite } from "@lucidcms/plugin-site/ui";
import vuePlugin from "@vitejs/plugin-vue";
import type { Plugin, ViteDevServer } from "vite";

/** Hides React Fast Refresh from plugin-vue's view of the server's `oxc` options so `@lucidcms/site-react` cannot inject React calls into Vue TypeScript. */
const withoutReactRefresh = (server: ViteDevServer): ViteDevServer => {
	const { oxc } = server.config;
	if (!oxc || typeof oxc.jsx !== "object" || !oxc.jsx.refresh) return server;
	const config = {
		...server.config,
		oxc: { ...oxc, jsx: { ...oxc.jsx, refresh: false } },
	};
	return new Proxy(server, {
		get: (target, key, receiver) =>
			key === "config" ? config : Reflect.get(target, key, receiver),
	});
};

/** plugin-vue, kept clear of React Fast Refresh, with Vue optimised up front. */
export default defineUiVite((files) => {
	const plugin = vuePlugin(files);
	const guard: Plugin = {
		name: "lucid:vue",
		// The generated hydration modules import Vue through this package, which Vite finds late. Optimising it up front
		// saves a second pass that leaves the browser with a stale copy.
		config: () => ({ optimizeDeps: { include: ["vue"] } }),
		// After plugin-vue's own hook, which hands it the server.
		configureServer: {
			order: "post",
			handler: (server) => {
				const { api } = plugin;
				if (api) {
					api.options = {
						...api.options,
						devServer: withoutReactRefresh(server),
					};
				}
			},
		},
	};
	return [plugin, guard];
});
