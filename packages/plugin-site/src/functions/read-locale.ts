import { LucidError } from "@lucidcms/core";
import type { RenderInfo } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState } from "../types.js";

/** The locale a read uses: the one it asks for, which must be one of the site's, or the render's. */
const readLocale = (
	config: SiteConfig,
	render: RenderInfo<SiteState>,
	requested: string | undefined,
): string => {
	if (requested === undefined) return render.state.locale;
	if (!config.locales.has(requested)) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${requested}' isn't one of the site's locales.`,
		});
	}
	return requested;
};

export default readLocale;
