import type { ServiceContext } from "../services/types.js";

/** Returns the CMS's base URL: `urls.cms` when set, otherwise the request's origin. */
const getBaseUrl = (context: ServiceContext): string =>
	context.config.urls.cms ?? new URL(context.request.url).origin;

export default getBaseUrl;
