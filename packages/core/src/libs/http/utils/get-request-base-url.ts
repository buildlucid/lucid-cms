import type { LucidHonoContext } from "../../../types/hono.js";

/** Returns the CMS's base URL from `url`. Never derive it from the request, as Host headers can be forged. */
const getRequestBaseUrl = (c: LucidHonoContext): string => c.get("config").url;

export default getRequestBaseUrl;
