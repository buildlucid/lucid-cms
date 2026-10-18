import type { LucidHonoContext } from "../../../types/hono.js";

/** Returns the CMS's base URL from a Hono context: `urls.cms` when set, otherwise the request's origin. */
const getRequestBaseUrl = (c: LucidHonoContext): string =>
	c.get("config").urls.cms ?? new URL(c.req.url).origin;

export default getRequestBaseUrl;
