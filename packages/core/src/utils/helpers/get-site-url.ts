import type { ServiceContext } from "../services/types.js";
import getBaseUrl from "./get-base-url.js";

/** Resolves `urls.site` against the CMS's base URL, returning null when no website is configured. */
const getSiteUrl = (context: ServiceContext): string | null => {
	const url = context.config.urls.site;
	if (!url) return null;

	return new URL(url, getBaseUrl(context)).toString();
};

export default getSiteUrl;
