import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { Toolkit } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import normalizeFilter from "../normalize-filter.js";
import type { SiteFunctionsContext } from "../site-functions-context.js";
import toTemplateList, {
	listDefaults,
	type TemplateList,
} from "../to-template-list.js";
import toTemplateMedia, { type TemplateMedia } from "../to-template-media.js";
import type { MediaReadOptions } from "./media.js";

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
const createMediaListFunction = (context: SiteFunctionsContext) =>
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
					filter: normalizeFilter<ListQuery["filter"]>(options.filter),
					sort: options.sort,
					page,
					perPage,
				},
				libraryOnly: true,
			});
			if (response.error) throw new LucidAPIError(response.error);

			const locale = options.locale ?? context.defaultLocale;
			return toTemplateList(
				response.data.data.map((media) => toTemplateMedia(media, locale)),
				{ total: response.data.count, page, perPage },
			);
		},
	);

export default createMediaListFunction;
