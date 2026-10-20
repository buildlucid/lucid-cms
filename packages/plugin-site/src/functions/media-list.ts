import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type {
	ContentList,
	LocalizedMedia,
	MediaListItem,
	Toolkit,
} from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";
import type { MediaReadOptions } from "./media.js";
import normalizeFilter from "./normalize-filter.js";
import readLocale from "./read-locale.js";

type ListQuery = NonNullable<
	NonNullable<Parameters<Toolkit["media"]["getMultiple"]>[0]>["query"]
>;

export type MediaListOptions = MediaReadOptions & {
	/** Toolkit filters, such as `{ type: "image" }`, with plain values as shorthand for equality. */
	filter?: unknown;
	sort?: ListQuery["sort"];
	/** Defaults to 1. */
	page?: number;
	/** Defaults to 10; use -1 to return every match. */
	perPage?: number;
};

/** Lists library media, as the content API does, without audio transcripts. */
const createMediaListFunction = (config: SiteConfig) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			options: MediaListOptions = {},
		): Promise<ContentList<LocalizedMedia<MediaListItem>>> => {
			render.tagCache(contentCacheTags.media);

			const response = await render.state.toolkit.media.getMultiple({
				libraryOnly: true,
				query: {
					filter: normalizeFilter(options.filter) as ListQuery["filter"],
					sort: options.sort,
					page: options.page,
					perPage: options.perPage,
				},
				locale: readLocale(config, render, options.locale),
				fallbackLocale: options.fallbackLocale,
			});
			if (response.error) throw new LucidAPIError(response.error);

			return response.data;
		},
	);

export default createMediaListFunction;
