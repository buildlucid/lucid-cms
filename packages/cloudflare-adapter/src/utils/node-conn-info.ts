import { getConnInfo } from "@hono/node-server/conninfo";
import type { LucidHonoContext } from "@lucidcms/core/types";

const getNodeConnInfo = (c: LucidHonoContext) => {
	const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
	const address =
		getConnInfo(c).remote.address ??
		forwardedFor ??
		c.req.header("x-real-ip") ??
		c.req.header("cf-connecting-ip") ??
		"127.0.0.1";
	const addressType: "IPv6" | "IPv4" = address.includes(":") ? "IPv6" : "IPv4";

	return {
		address,
		port: undefined,
		addressType,
	};
};

export default getNodeConnInfo;
