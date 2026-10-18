import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";
import type { SiteReadFunctions } from "./create-read-functions.js";
import type { SiteFunctionSource } from "./site-function-source.js";

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
