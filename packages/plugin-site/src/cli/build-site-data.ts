import type { SiteCliData } from "../types.js";
import readTemplates from "./read-templates.js";
import buildAssets from "./vite/build-assets.js";

/** Reads the site's templates and builds its Vite files, for `lucidcms build` and `site:build` alike. */
const buildSiteData = async (
	props: Omit<Parameters<typeof buildAssets>[0], "templates">,
): Promise<Extract<SiteCliData, { kind: "build" }>> => {
	const templates = await readTemplates(props.root);
	return {
		kind: "build",
		buildId: crypto.randomUUID().slice(0, 16),
		templates,
		manifest: await buildAssets({ ...props, templates }),
	};
};

export default buildSiteData;
