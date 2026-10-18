import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";
import type createDocumentFunction from "./functions/document.js";
import type createDocumentPathsFunction from "./functions/document-paths.js";
import type createDocumentsFunction from "./functions/documents.js";
import type { SiteFunctionSource } from "./site-function-sources.js";

export type SiteReadFunctions = {
	document: ReturnType<typeof createDocumentFunction>;
	documents: ReturnType<typeof createDocumentsFunction>;
	documentPaths: ReturnType<typeof createDocumentPathsFunction>;
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
					documents: (collection, options) =>
						reads.documents.call(render, collection, options),
					documentPaths: (collection) =>
						reads.documentPaths.call(render, collection),
				},
				render,
			},
			...args,
		),
	);

export default bindSiteFunction;
