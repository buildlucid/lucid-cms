import { defineHookEvents } from "@lucidcms/core";
import type { TransformHookEvent } from "@lucidcms/core/types";
import type { SiteStaticFile } from "../types.js";

/** What a static build is for. */
export type SiteStaticFilesHookMeta = {
	/** The environment the site shows, or latest. */
	environment: string;
};

/** Files to write beside the pages a static build renders. */
export type SiteStaticFilesHookData = {
	files: SiteStaticFile[];
};

declare module "@lucidcms/core/types" {
	interface PluginHookEvents {
		site: {
			/**
			 * Runs in `site:build` after every page rendered. Add files to write into the build folder,
			 * such as `{ path: "/sitemap.xml", body }`. A page or public file at the same path wins.
			 */
			staticFiles: TransformHookEvent<
				SiteStaticFilesHookMeta,
				SiteStaticFilesHookData
			>;
		};
	}
}

/** Hook events projects and plugins can subscribe to with `service: "site"`. */
export default defineHookEvents({
	key: "site",
	events: { staticFiles: "transform" },
});
