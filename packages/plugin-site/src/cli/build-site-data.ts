import type { SiteCliData } from "../types.js";
import buildAssets from "./build-assets.js";
import readTemplates from "./read-templates.js";

/** Reads the site's templates and builds its Vite files, for `lucidcms build` and `site:build` alike. */
const buildSiteData = async (
	props: Omit<Parameters<typeof buildAssets>[0], "templates">,
): Promise<Extract<SiteCliData, { mode: "build" }>> => {
	const templates = await readTemplates(props.root);
	return {
		mode: "build",
		templates,
		manifest: await buildAssets({ ...props, templates }),
	};
};

export default buildSiteData;
