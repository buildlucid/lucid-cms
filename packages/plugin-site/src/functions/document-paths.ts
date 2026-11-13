import { contentCacheTags } from "@lucidcms/core/extension";
import type { CollectionDocumentKey } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import listDocumentPaths from "../content/list-document-paths.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";

/**
 * Lists a collection's document URLs in the locales of the render's domain, such as for
 * `{% export paths = documentPaths("page") %}`: every site locale unless `siteUrl` puts them on
 * more than one domain.
 */
const createDocumentPathsFunction = (config: SiteConfig) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			collectionKey: CollectionDocumentKey,
		): Promise<string[]> => {
			const version = config.getVersion(collectionKey);
			if (version === null) return [];
			render.tagCache(contentCacheTags.collection(collectionKey));
			// A render's locale is always one of its domain's, and each locale is on one domain.
			const domain = config.domains.find((item) =>
				item.locales.includes(render.state.locale),
			);
			return listDocumentPaths(
				render.state.toolkit,
				collectionKey,
				version,
				new Set(domain?.locales),
			);
		},
	);

export default createDocumentPathsFunction;
