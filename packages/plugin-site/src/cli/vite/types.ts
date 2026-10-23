import type { BuiltSiteData } from "../../types.js";
import type { ResolvedIntegrations } from "../ui/resolve-integrations.js";

/** What a client build produced, which the server build embeds and `site:build` reads. */
export type SiteClientBuild = {
	data: BuiltSiteData;
	/** Each UI component templates name, with its integration. */
	components: Map<string, string>;
};

/** What the site's Vite plugins share about the site and the Vite app it joins. */
export type SiteViteContext = {
	/** The site directory. */
	root: string;
	ui: ResolvedIntegrations | null;
	/** The file extensions the UI integrations compile, such as `.tsx`. */
	extensions: string[];
	/** The runtime adapter's key. */
	runtime: string;
	/** The site directory's path from Vite's root with a trailing slash, set during config resolution. */
	prefix: string;
	/** The Vite root, set during config resolution. */
	viteRoot: string;
	/** The last client build's output, or null before one ran. */
	clientBuild: SiteClientBuild | null;
};

/** What `site:build` reads from the client build through the client build plugin's `api`. */
export type SiteVitePluginApi = {
	/** The asset data of the last client build, or null before one ran. */
	clientBuild: () => SiteClientBuild["data"] | null;
};
