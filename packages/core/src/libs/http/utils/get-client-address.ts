import ipaddr from "ipaddr.js";
import type { LucidHonoContext } from "../../../types/hono.js";

/**
 * Resolves the client IP using `http.security.proxy`, falling back to the runtime connection
 * address.
 */
const getClientAddress = (c: LucidHonoContext): string | null => {
	const proxy = c.get("config").http.security.proxy;
	if (proxy) {
		const forwarded = (
			"header" in proxy
				? c.req.header(proxy.header)
				: //* visitors can write their own entries, but only to the left of the ones proxies add
					c.req.header("x-forwarded-for")?.split(",").at(-proxy.hops)
		)?.trim();
		if (forwarded && ipaddr.isValid(forwarded)) return forwarded;
	}

	return c.get("runtimeContext").getConnectionInfo(c).address ?? null;
};

export default getClientAddress;
