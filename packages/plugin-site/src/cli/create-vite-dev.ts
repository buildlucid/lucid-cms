import type { LucidPluginCli, LucidPluginCliDev } from "@lucidcms/core/types";
import { ASSETS_BASE, TEMPLATE_EXTENSION } from "../constants.js";
import type { SiteCliData } from "../types.js";
import createViteOptions from "./create-vite-options.js";
import importVite from "./import-vite.js";

type DevProps = Parameters<NonNullable<LucidPluginCli["dev"]>>[0];

/** Locates the site for the runtime and, when Vite is installed, serves `/_assets/` with HMR and reloads pages on template changes. */
const createViteDev = async (
	props: DevProps & { root: string },
): Promise<LucidPluginCliDev> => {
	const vite = await importVite();
	if (!vite) {
		const data: SiteCliData = {
			mode: "dev",
			directory: props.root,
			vite: false,
		};
		return { data };
	}

	const server = await vite.createServer({
		...createViteOptions(props),
		mode: "development",
		appType: "custom",
		server: {
			middlewareMode: true,
			ws: { server: props.server, path: "__hmr" },
		},
	});
	server.watcher.on("all", (event, file) => {
		if (file.endsWith(TEMPLATE_EXTENSION) && event !== "addDir") {
			server.ws.send({ type: "full-reload" });
		}
	});

	const data: SiteCliData = {
		mode: "dev",
		directory: props.root,
		vite: true,
	};
	return {
		middleware: (request, response, next) => {
			const originalUrl = request.url;
			if (!originalUrl?.startsWith(ASSETS_BASE)) return next();

			// Vite strips its base from request.url. Restore it before the host handles a miss.
			server.middlewares(request, response, (error: unknown) => {
				request.url = originalUrl;
				next(error);
			});
		},
		close: () => server.close(),
		data,
	};
};

export default createViteDev;
