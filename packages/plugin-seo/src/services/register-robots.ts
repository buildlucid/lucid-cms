import { copy } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY, robots } from "../constants.js";
import registerRobotsFile from "../http/register-robots-file.js";
import robotsRoutes from "../routes/robots.js";
import addRootFiles from "./add-root-files.js";
import type { SeoPluginOptionsInternal } from "./parse-plugin-options.js";

/** Adds robots.txt's API key scope, its content API route and the CMS's own `/robots.txt`. */
const registerRobots = (
	draft: ResolvedLucidConfig,
	options: SeoPluginOptionsInternal,
) => {
	draft.access.push({
		key: "robots",
		name: copy("admin:plugin.seo.access.robots.label"),
		scopes: {
			[robots.scope]: {
				//* robots.txt only says what crawlers may fetch from the site
				userPermission: null,
				name: copy("admin:plugin.seo.access.robots.read"),
			},
		},
	});
	draft.http.routes.push(...robotsRoutes(options));
	addRootFiles(draft, `${PLUGIN_KEY}:robots`, registerRobotsFile(options));
};

export default registerRobots;
