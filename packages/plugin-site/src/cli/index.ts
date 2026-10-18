import path from "node:path";
import type { LucidPluginCliFactory } from "@lucidcms/core/types";
import type { SiteCliData } from "../types.js";
import buildAssets from "./build-assets.js";
import createViteDev from "./create-vite-dev.js";
import readTemplates from "./read-templates.js";

export type SiteCliOptions = {
	/** The site's folder relative to the project root, which is also Vite's root. */
	directory: string;
};

/** The site plugin's CLI module, loaded only by `lucidcms dev`, `build` and `serve`. */
const siteCli: LucidPluginCliFactory<SiteCliOptions> = (options) => ({
	dev: (props) =>
		createViteDev({
			...props,
			root: path.resolve(props.projectRoot, options.directory),
		}),
	build: async (props) => {
		const root = path.resolve(props.projectRoot, options.directory);
		const templates = await readTemplates(root);
		const data: SiteCliData = {
			mode: "build",
			templates,
			manifest: await buildAssets({ ...props, root, templates }),
		};
		return { data };
	},
});

export default siteCli;
