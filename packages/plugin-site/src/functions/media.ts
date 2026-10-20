import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { LocalizedMedia } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";
import readLocale from "./read-locale.js";

export type MediaReadOptions = {
	/** One of the site's locales for text such as `alt`, defaulting to the render's `locale`. */
	locale?: string;
	/** The locale empty text falls back to, such as the default locale. */
	fallbackLocale?: string;
};

/** Reads one library media item, as the content API does, or null when there's none. */
const createMediaFunction = (config: SiteConfig) =>
	withRender(
		async (
			render: RenderInfo<SiteState>,
			id: number,
			options: MediaReadOptions = {},
		): Promise<LocalizedMedia | null> => {
			// Media includes other media, such as active crops and video posters, so any media change can affect it.
			render.tagCache(contentCacheTags.media);

			const response = await render.state.toolkit.media.getSingle({
				id,
				libraryOnly: true,
				locale: readLocale(config, render, options.locale),
				fallbackLocale: options.fallbackLocale,
			});
			if (response.error?.status === 404) return null;
			if (response.error) throw new LucidAPIError(response.error);

			return response.data;
		},
	);

export default createMediaFunction;
