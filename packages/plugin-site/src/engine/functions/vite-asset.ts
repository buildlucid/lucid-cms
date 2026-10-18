import { ASSETS_BASE } from "../../constants.js";
import type { SiteCliData } from "../../types.js";
import normalizeVitePath from "../../utils/normalize-vite-path.js";

/**
 * Returns the URL of one file Vite builds, such as an image, given as a path within the site directory: `<img src="{{ viteAsset("images/logo.svg") }}">`.
 *
 * Paths must be written out, because `lucidcms build` finds them in templates.
 */
const createViteAssetFunction =
	(data: SiteCliData | null) => (value: string) => {
		if (!data || (data.mode === "dev" && !data.vite)) {
			throw new Error(
				"viteAsset() needs Vite. Install the vite package and restart the server.",
			);
		}

		const path = normalizeVitePath(value);
		if (data.mode === "dev") return ASSETS_BASE + path;

		const chunk = data.manifest?.[path];
		if (!chunk) {
			throw new Error(
				`"${path}" isn't in the site's Vite build. Run lucidcms build again.`,
			);
		}
		return ASSETS_BASE + chunk.file;
	};

export default createViteAssetFunction;
