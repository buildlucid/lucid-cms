import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type {
	CollectionDocumentKey,
	ContentDocument,
	ContentList,
	Toolkit,
} from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import recordFieldTargets from "../preview/field-targets.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";
import type { DocumentFilter, DocumentReadOptions } from "./document.js";
import normalizeFilter from "./normalize-filter.js";
import readLocale from "./read-locale.js";

type ListInput = Parameters<Toolkit["documents"]["getMultiple"]>[0];

export type DocumentListOptions = DocumentReadOptions & {
	sort?: NonNullable<ListInput["query"]>["sort"];
	/** Defaults to 1. */
	page?: number;
	/** Defaults to 10; use -1 to return every match. */
	perPage?: number;
};

const createDocumentListFunction = (config: SiteConfig) =>
	withRender(
		async <Key extends CollectionDocumentKey>(
			render: RenderInfo<SiteState>,
			collectionKey: Key,
			options: DocumentListOptions = {},
		): Promise<ContentList<ContentDocument<Key, true>>> => {
			const version = config.getVersion(collectionKey, options.version);
			if (version === null) {
				// The toolkit's own page defaults, as there's no read to report them.
				const perPage = options.perPage ?? 10;
				return {
					items: [],
					pagination: {
						currentPage: options.page ?? 1,
						perPage,
						total: 0,
						lastPage: 0,
					},
				};
			}
			render.tagCache(contentCacheTags.collection(collectionKey));

			const input = {
				collectionKey,
				version,
				preview: render.state.preview?.token ?? null,
				locale: readLocale(config, render, options.locale),
				fallbackLocale: options.fallbackLocale,
				depth: options.depth,
				query: {
					filter: normalizeFilter(options.filter) as DocumentFilter | undefined,
					sort: options.sort,
					page: options.page,
					perPage: options.perPage,
					include: options.include,
				},
			} satisfies ListInput;
			const { documents } = render.state.toolkit;
			let response = await documents.getMultiple(input);
			if (response.error?.code === "preview_scope") {
				response = await documents.getMultiple({
					...input,
					preview: null,
				});
			}
			if (response.error) throw new LucidAPIError(response.error);

			// Documents include their media, so any media change can affect them.
			render.tagCache(contentCacheTags.media);
			if (render.state.preview) {
				for (const document of response.data.items) {
					recordFieldTargets(document, config.collections);
				}
			}
			// The key was widened for the read; the documents are the ones asked for.
			return response.data as ContentList<ContentDocument<Key, true>>;
		},
	);

export default createDocumentListFunction;
