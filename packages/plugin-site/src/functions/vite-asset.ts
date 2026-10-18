import { ASSETS_BASE } from "../constants.js";
import type { SiteCliData } from "../types.js";
import normalizeVitePath from "../utils/normalize-vite-path.js";
import { getBuiltChunk, requireVite } from "./vite-build.js";

/**
 * Returns the URL of one file Vite builds, such as an image, given as a path within the site directory: `<img src="{{ viteAsset("images/logo.svg") }}">`.
 *
 * Paths must be written out, because `lucidcms build` finds them in templates.
 */
const createViteAssetFunction =
	(data: SiteCliData | null) => (value: string) => {
		const vite = requireVite(data, "viteAsset");
		const path = normalizeVitePath(value);
		if (vite.kind === "dev") return ASSETS_BASE + path;

		return ASSETS_BASE + getBuiltChunk(vite.manifest, path).file;
	};

export default createViteAssetFunction;
