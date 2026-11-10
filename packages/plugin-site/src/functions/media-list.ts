import { LucidError } from "@lucidcms/core";
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
import readLocale from "./read-locale.js";

type ListInput = NonNullable<Parameters<Toolkit["media"]["getMultiple"]>[0]>;

export type MediaListOptions = MediaReadOptions & {
	/** Filters such as `{ type: "image" }`, where a plain value matches for equality. A list of filter objects matches any of them. */
	filter?: ListInput["filter"];
	sort?: ListInput["sort"];
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
				filter: options.filter,
				sort: options.sort,
				page: options.page,
				perPage: options.perPage,
				locale: readLocale(config, render, options.locale),
				fallbackLocale: options.fallbackLocale,
			});
			if (response.error) throw new LucidError(response.error);

			return response.data;
		},
	);

export default createMediaListFunction;
