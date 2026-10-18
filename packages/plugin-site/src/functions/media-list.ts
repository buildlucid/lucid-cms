import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { Toolkit } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import toTemplateList, {
	listDefaults,
	type TemplateList,
} from "../content/to-template-list.js";
import toTemplateMedia, {
	type TemplateMedia,
} from "../content/to-template-media.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";
import type { MediaReadOptions } from "./media.js";
import normalizeFilter from "./normalize-filter.js";

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

/** Lists library media, as the content API does. */
const createMediaListFunction = (config: SiteConfig) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			options: MediaListOptions = {},
		): Promise<TemplateList<TemplateMedia>> => {
			const page = options.page ?? listDefaults.page;
			const perPage = options.perPage ?? listDefaults.perPage;
			render.tagCache(contentCacheTags.media);

			const response = await render.state.toolkit.media.getMultiple({
				query: {
					filter: normalizeFilter(options.filter) as ListQuery["filter"],
					sort: options.sort,
					page,
					perPage,
				},
				libraryOnly: true,
			});
			if (response.error) throw new LucidAPIError(response.error);

			const locale = options.locale ?? config.defaultLocale;
			return toTemplateList(
				response.data.data.map((media) => toTemplateMedia(media, locale)),
				{ total: response.data.count, page, perPage },
			);
		},
	);

export default createMediaListFunction;
