import type { SiteCliData } from "../types.js";
import readTemplates from "./read-templates.js";
import buildUiServer from "./ui/build-ui-server.js";
import findUiComponents from "./ui/find-ui-components.js";
import type { ResolvedIntegrations } from "./ui/resolve-integrations.js";
import uiVitePlugins from "./ui/ui-vite-plugins.js";
import buildAssets from "./vite/build-assets.js";
import createViteOptions from "./vite/create-vite-options.js";
import requireViteForUi from "./vite/require-vite-for-ui.js";

/** Reads templates and builds Vite assets for `lucidcms build` and `site:build`, optionally bundling UI server components into `serverDir` and returning the module path. */
const buildSiteData = async (
	props: Omit<Parameters<typeof buildAssets>[0], "templates" | "ui"> & {
		ui: ResolvedIntegrations | null;
		serverDir: string;
	},
): Promise<{
	data: Extract<SiteCliData, { kind: "build" }>;
	module: string | null;
}> => {
	const templates = await readTemplates(props.root);
	const integrations = props.ui;
	const components = integrations
		? await findUiComponents(templates, integrations)
		: new Map<string, string>();
	const plugins =
		integrations && components.size > 0
			? await uiVitePlugins({ root: props.root, integrations })
			: [];
	const assets = await buildAssets({
		...props,
		templates,
		ui: components.size > 0 ? { components, plugins } : null,
	});
	const module =
		integrations && assets.ui
			? await buildUiServer({
					vite: await requireViteForUi(),
					options: createViteOptions(props),
					root: props.root,
					outDir: props.serverDir,
					components: [...components.keys()],
					integrations,
					plugins,
				})
			: null;

	return {
		data: {
			kind: "build",
			buildId: crypto.randomUUID().slice(0, 16),
			templates,
			manifest: assets.manifest,
			ui: assets.ui,
		},
		module,
	};
};

export default buildSiteData;
