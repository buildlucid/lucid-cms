import type { LucidHonoContext } from "../../types/hono.js";

/** Uses the public `url` to set secure cookies, since proxies may forward HTTPS over HTTP. */
const isRequestSecure = (c: LucidHonoContext) =>
	new URL(c.get("config").url).protocol === "https:";

export default isRequestSecure;
