import type { Plugin } from "vite";
import type { ResolvedIntegrations } from "../ui/resolve-integrations.js";
import siteAcceptPlugin from "./site-accept-plugin.js";
import siteClientBuildPlugin from "./site-client-build-plugin.js";
import siteDevPlugin from "./site-dev-plugin.js";
import siteModulePlugin from "./site-module-plugin.js";
import type { SiteViteContext } from "./types.js";

/** Adds site rendering to Vite, building `vite()`, `viteAsset()` and hydration assets before the server embeds their manifest, with development reloads for template and server component changes. */
const siteVitePlugins = (props: {
	/** The site directory. */
	root: string;
	ui: ResolvedIntegrations | null;
	/** The runtime adapter's key. */
	runtime: string;
}): Plugin[] => {
	const context: SiteViteContext = {
		root: props.root,
		ui: props.ui,
		extensions: [
			...new Set(
				props.ui?.list.flatMap((integration) => integration.extensions),
			),
		],
		runtime: props.runtime,
		prefix: "",
		viteRoot: "",
		clientBuild: null,
	};

	return [
		siteModulePlugin(context),
		siteClientBuildPlugin(context),
		siteDevPlugin(context),
		siteAcceptPlugin(context),
	];
};

export default siteVitePlugins;
