import type { SiteData } from "../types.js";
import normalizeVitePath from "../utils/normalize-vite-path.js";
import { getBuiltChunk } from "./vite-build.js";

/**
 * Returns the URL of one file Vite builds, such as an image, given as a path within the site directory: `<img src="{{ viteAsset("images/logo.svg") }}">`.
 *
 * Paths must be written out, because `lucidcms build` finds them in templates.
 */
const createViteAssetFunction = (data: SiteData) => (value: string) => {
	const path = data.prefix + normalizeVitePath(value);
	if (data.kind === "dev") return `/${path}`;

	return `/${getBuiltChunk(data.manifest, path).file}`;
};

export default createViteAssetFunction;
