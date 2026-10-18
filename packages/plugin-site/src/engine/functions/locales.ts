import { LucidAPIError } from "@lucidcms/core";
import type { Locale } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";

/** Lists enabled content locales from config without a cache tag. */
const locales = withRender(
	async (render: RenderInfo<SiteState>): Promise<Locale[]> => {
		const response = await render.state.toolkit.locales.getAll();
		if (response.error) throw new LucidAPIError(response.error);

		return response.data;
	},
);

export default locales;
