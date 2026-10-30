import type { LucidHonoContext } from "@lucidcms/core/types";

/** Reads the client address from Cloudflare's `cf-connecting-ip` header, falling back to proxy headers when it's missing. */
const getCloudflareConnInfo = (c: LucidHonoContext) => {
	const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
	const address =
		c.req.header("cf-connecting-ip") ??
		forwardedFor ??
		c.req.header("x-real-ip") ??
		"127.0.0.1";
	const addressType: "IPv6" | "IPv4" = address.includes(":") ? "IPv6" : "IPv4";

	return {
		address,
		port: undefined,
		addressType,
	};
};

export default getCloudflareConnInfo;
