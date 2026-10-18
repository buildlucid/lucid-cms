import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import toTemplateMedia, {
	type TemplateMedia,
} from "../content/to-template-media.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";

export type MediaReadOptions = {
	/** Locale for text such as `alt`, defaulting to the default locale. */
	locale?: string;
};

/** Reads one library media item, as the content API does, or null when there's none. */
const createMediaFunction = (config: SiteConfig) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			id: number,
			options: MediaReadOptions = {},
		): Promise<TemplateMedia | null> => {
			// Media includes other media, such as active crops and video posters, so any media change can affect it.
			render.tagCache(contentCacheTags.media);

			const response = await render.state.toolkit.media.getSingle({
				id,
				libraryOnly: true,
			});
			if (response.error?.status === 404) return null;
			if (response.error) throw new LucidAPIError(response.error);

			return toTemplateMedia(
				response.data,
				options.locale ?? config.defaultLocale,
			);
		},
	);

export default createMediaFunction;
