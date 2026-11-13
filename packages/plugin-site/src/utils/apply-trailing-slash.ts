import type { SiteTrailingSlash } from "../types.js";

/** A path with repeated slashes collapsed and its trailing slash as `trailingSlash` says. The root stays `/`. */
const applyTrailingSlash = (path: string, trailingSlash: SiteTrailingSlash) => {
	const collapsed = path.replace(/\/{2,}/g, "/");
	const bare = collapsed.length > 1 ? collapsed.replace(/\/$/, "") : collapsed;
	return trailingSlash === "always" && bare !== "/" ? `${bare}/` : bare;
};

export default applyTrailingSlash;
