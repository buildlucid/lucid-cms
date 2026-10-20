import { LucidAPIError } from "@lucidcms/core";
import type { Locale } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";

/** Lists the site's content locales without a cache tag. */
const createLocalesFunction = (config: SiteConfig) =>
	withRender(async (render: RenderInfo<SiteState>): Promise<Locale[]> => {
		const response = await render.state.toolkit.locales.getAll();
		if (response.error) throw new LucidAPIError(response.error);

		return response.data.filter((locale) => config.locales.has(locale.code));
	});

export default createLocalesFunction;
