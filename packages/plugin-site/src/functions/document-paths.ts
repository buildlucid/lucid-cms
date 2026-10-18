import { contentCacheTags } from "@lucidcms/core/extension";
import type { CollectionDocumentKey } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import listDocumentPaths from "../content/list-document-paths.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";

/** Lists a collection's document URLs in every locale, such as for `{% export paths = documentPaths("page") %}`. */
const createDocumentPathsFunction = (config: SiteConfig) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			collectionKey: CollectionDocumentKey,
		): Promise<string[]> => {
			const version = config.getVersion(collectionKey);
			if (version === null) return [];
			render.tagCache(contentCacheTags.collection(collectionKey));
			return listDocumentPaths(render.state.toolkit, collectionKey, version);
		},
	);

export default createDocumentPathsFunction;
