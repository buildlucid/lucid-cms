import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";
import type createDocumentFunction from "./functions/document.js";
import type createDocumentListFunction from "./functions/document-list.js";
import type createDocumentPathsFunction from "./functions/document-paths.js";
import type locales from "./functions/locales.js";
import type createMediaFunction from "./functions/media.js";
import type createMediaListFunction from "./functions/media-list.js";
import type mediaUrl from "./functions/media-url.js";
import type { SiteFunctionSource } from "./site-function-sources.js";

export type SiteReadFunctions = {
	document: ReturnType<typeof createDocumentFunction>;
	documentList: ReturnType<typeof createDocumentListFunction>;
	documentPaths: ReturnType<typeof createDocumentPathsFunction>;
	media: ReturnType<typeof createMediaFunction>;
	mediaList: ReturnType<typeof createMediaListFunction>;
	mediaUrl: typeof mediaUrl;
	locales: typeof locales;
};

/** Gives a site function this Kiln's built-in reads, bound to the calling render. */
const bindSiteFunction = (
	source: SiteFunctionSource,
	reads: SiteReadFunctions,
) =>
	withRender((render: RenderInfo<SiteState>, ...args: unknown[]) =>
		source(
			{
				toolkit: render.state.toolkit,
				preview: render.state.preview?.token ?? null,
				version: render.state.version,
				path: render.state.path,
				tagCache: (...tags) => render.tagCache(...tags),
				functions: {
					document: (collection, options) =>
						reads.document.call(render, collection, options),
					documentList: (collection, options) =>
						reads.documentList.call(render, collection, options),
					documentPaths: (collection) =>
						reads.documentPaths.call(render, collection),
					media: (id, options) => reads.media.call(render, id, options),
					mediaList: (options) => reads.mediaList.call(render, options),
					mediaUrl: (media, options) =>
						reads.mediaUrl.call(render, media, options),
					locales: () => reads.locales.call(render),
				},
				render,
			},
			...args,
		),
	);

export default bindSiteFunction;
