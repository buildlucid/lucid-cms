import { contentCacheTags } from "@lucidcms/core/extension";
import type { CollectionDocumentKey } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import listDocumentPaths from "../list-document-paths.js";
import type { SiteFunctionsContext } from "../site-functions-context.js";

/** Lists a collection's document URLs in every locale, such as for `{% export paths = documentPaths("page") %}`. */
const createDocumentPathsFunction = (context: SiteFunctionsContext) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			collectionKey: CollectionDocumentKey,
		): Promise<string[]> => {
			const version = context.getVersion(collectionKey);
			if (version === null) return [];
			render.tagCache(contentCacheTags.collection(collectionKey));
			return listDocumentPaths(render.state.toolkit, collectionKey, version);
		},
	);

export default createDocumentPathsFunction;
