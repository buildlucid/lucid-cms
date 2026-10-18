import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { CollectionDocumentKey } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import getRouteUrls from "../content/get-route-urls.js";
import toTemplateDocument, {
	type TemplateDocument,
} from "../content/to-template-document.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";
import normalizeFilter from "./normalize-filter.js";

type ReadQuery = NonNullable<
	Parameters<SiteState["toolkit"]["documents"]["getSingle"]>[0]["query"]
>;

export type DocumentFilter = NonNullable<ReadQuery["filter"]>;

export type DocumentReadOptions = {
	/** What to read alongside fields, such as `["bricks", "refs.media"]`; included refs fill in their fields. */
	include?: ReadQuery["include"];
	/** Toolkit filters, with plain values as shorthand for equality; a list of filters matches any of them. */
	filter?: unknown;
	/** Defaults to the matching route locale for document(), otherwise the default locale. */
	locale?: string;
	/** Defaults to the site environment, or latest for collections without environments. */
	version?: string;
};

const createDocumentFunction = (config: SiteConfig) =>
	withRender(
		async <Key extends CollectionDocumentKey>(
			render: RenderInfo<SiteState>,
			collectionKey: Key,
			options: DocumentReadOptions = {},
		): Promise<TemplateDocument<Key> | null> => {
			const version = config.getVersion(collectionKey, options.version);
			if (version === null) return null;
			render.tagCache(contentCacheTags.collection(collectionKey));

			// Template filters and versions are checked by the toolkit at runtime, so read untyped.
			const key: CollectionDocumentKey = collectionKey;
			const response = await render.state.toolkit.documents.getSingle({
				collectionKey: key,
				version,
				preview: render.state.preview?.token ?? null,
				query: {
					filter: normalizeFilter(options.filter) as DocumentFilter | undefined,
					include: options.include,
				},
			});
			if (response.error?.status === 404) return null;
			if (response.error) throw new LucidAPIError(response.error);

			const { document, refs = {} } = response.data;
			if (refs.media?.length) render.tagCache(contentCacheTags.media);
			const urls = getRouteUrls(document.route, config.defaultLocale);
			const routeLocale = Object.keys(urls).find(
				(code) => urls[code] === render.state.path,
			);

			return toTemplateDocument<Key>({
				document,
				refs,
				locale: options.locale ?? routeLocale ?? config.defaultLocale,
				config,
			});
		},
	);

export default createDocumentFunction;
