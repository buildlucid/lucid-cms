import path from "node:path";
import type {
	LucidPluginCliDev,
	LucidPluginCliHooks,
} from "@lucidcms/core/types";
import { ASSETS_BASE, TEMPLATE_EXTENSION } from "../../constants.js";
import type { SiteCliData } from "../../types.js";
import createDevUi from "../ui/create-dev-ui.js";
import type { ResolvedIntegrations } from "../ui/resolve-integrations.js";
import uiVitePlugins from "../ui/ui-vite-plugins.js";
import createViteOptions from "./create-vite-options.js";
import importVite from "./import-vite.js";
import requireViteForUi from "./require-vite-for-ui.js";

type DevProps = Parameters<NonNullable<LucidPluginCliHooks["dev"]>>[0];

/** Sets the runtime's site directory and, when Vite is available, serves `/_assets/` with HMR, template reloads and UI compilation for server and browser. */
const createViteDev = async (
	props: DevProps & { root: string; ui: ResolvedIntegrations | null },
): Promise<LucidPluginCliDev> => {
	const vite = props.ui ? await requireViteForUi() : await importVite();
	if (!vite) {
		const data: SiteCliData = {
			kind: "dev",
			directory: props.root,
			vite: false,
			ui: null,
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
		// Renderers load through Vite like components, so both share one copy of their library.
		...(props.ui && {
			ssr: { noExternal: props.ui.packages },
			plugins: await uiVitePlugins({
				root: props.root,
				integrations: props.ui,
			}),
		}),
	});
	const ui = props.ui
		? createDevUi({
				server,
				root: props.root,
				integrations: props.ui,
				createRunner: vite.createServerModuleRunner,
			})
		: null;
	// Pages render templates and UI components on the server, so a change to either reloads them. Vite's hot updates
	// keep hydrated components' state instead, unless a page also renders the change without hydrating.
	server.watcher.on("all", (event, file) => {
		if (event === "addDir") return;
		const name = path.relative(props.root, file).split(path.sep).join("/");
		const rendered =
			props.ui !== null &&
			(props.ui.match(name) !== null ||
				server.environments.ssr.moduleGraph.getModulesByFile(file) !==
					undefined);
		const inBrowser = Boolean(
			server.environments.client.moduleGraph.getModulesByFile(file)?.size,
		);
		if (
			file.endsWith(TEMPLATE_EXTENSION) ||
			(rendered && (!inBrowser || ui?.rendersOnServer(file)))
		) {
			server.ws.send({ type: "full-reload" });
		}
	});

	const data: SiteCliData = {
		kind: "dev",
		directory: props.root,
		vite: true,
		ui,
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
