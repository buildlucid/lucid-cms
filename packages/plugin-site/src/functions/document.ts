import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type {
	CollectionDocumentKey,
	ContentDocument,
} from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import recordFieldTargets from "../preview/field-targets.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";
import normalizeFilter from "./normalize-filter.js";
import readLocale from "./read-locale.js";

type ReadQuery = NonNullable<
	Parameters<SiteState["toolkit"]["documents"]["getSingle"]>[0]["query"]
>;

export type DocumentFilter = NonNullable<ReadQuery["filter"]>;

type ReadInput = Parameters<SiteState["toolkit"]["documents"]["getSingle"]>[0];

export type DocumentReadOptions = {
	/** What to read alongside fields, such as `["bricks"]`. */
	include?: ReadQuery["include"];
	/** Depth of related documents to fill in, from 0 to 3, defaulting to 1. */
	depth?: ReadInput["depth"];
	/** Toolkit filters, with plain values as shorthand for equality; a list of filters matches any of them. */
	filter?: unknown;
	/** One of the site's locales, defaulting to the render's `locale`. */
	locale?: string;
	/** The locale an empty translation falls back to, such as the default locale. */
	fallbackLocale?: string;
	/** Defaults to the site environment, or latest for collections without environments. */
	version?: string;
};

const createDocumentFunction = (config: SiteConfig) =>
	withRender(
		async <Key extends CollectionDocumentKey>(
			render: RenderInfo<SiteState>,
			collectionKey: Key,
			options: DocumentReadOptions = {},
		): Promise<ContentDocument<Key, true> | null> => {
			const version = config.getVersion(collectionKey, options.version);
			if (version === null) return null;
			render.tagCache(contentCacheTags.collection(collectionKey));

			// Template filters and versions are checked by the toolkit at runtime, so read untyped.
			const key: CollectionDocumentKey = collectionKey;
			const response = await render.state.toolkit.documents.getSingle({
				collectionKey: key,
				version,
				preview: render.state.preview?.token ?? null,
				locale: readLocale(config, render, options.locale),
				fallbackLocale: options.fallbackLocale,
				depth: options.depth,
				query: {
					filter: normalizeFilter(options.filter) as DocumentFilter | undefined,
					include: options.include,
				},
			});
			if (response.error?.status === 404) return null;
			if (response.error) throw new LucidAPIError(response.error);

			// Documents include their media, so any media change can affect them.
			render.tagCache(contentCacheTags.media);
			if (render.state.preview)
				recordFieldTargets(response.data, config.collections);
			// The key was widened for the read; the document is the one asked for.
			return response.data as ContentDocument<Key, true>;
		},
	);

export default createDocumentFunction;
