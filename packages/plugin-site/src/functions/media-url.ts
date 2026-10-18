import { LucidAPIError } from "@lucidcms/core";
import { contentCacheTags } from "@lucidcms/core/extension";
import type { Toolkit } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";

type ResolveInput = Parameters<Toolkit["media"]["resolveUrl"]>[0];

export type MediaUrlOptions = Pick<ResolveInput, "preset" | "format">;

/** A library media item's URL, optionally through a preset or format, or null when there's none. */
const mediaUrl = withRender(
	async (
		render: RenderInfo<SiteState>,
		media: { key: string } | string,
		options: MediaUrlOptions = {},
	): Promise<string | null> => {
		render.tagCache(contentCacheTags.media);

		const response = await render.state.toolkit.media.resolveUrl({
			key: typeof media === "string" ? media : media.key,
			preset: options.preset,
			format: options.format,
			libraryOnly: true,
		});
		if (response.error?.status === 404) return null;
		if (response.error) throw new LucidAPIError(response.error);

		return response.data.url;
	},
);

export default mediaUrl;
