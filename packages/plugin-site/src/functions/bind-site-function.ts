import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteFunctionContext, SiteState } from "../types.js";
import { assetLink, assetScript } from "../ui/page-assets.js";
import type { SiteReadFunctions } from "./create-read-functions.js";
import type { SiteFunctionSource } from "./site-function-source.js";

const assets: SiteFunctionContext["assets"] = {
	script: assetScript,
	style: (href) => assetLink("stylesheet", href),
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
				locale: render.state.locale,
				tagCache: (...tags) => render.tagCache(...tags),
				assets,
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
