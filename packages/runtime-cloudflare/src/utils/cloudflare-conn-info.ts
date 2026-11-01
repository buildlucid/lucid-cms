import type { LucidHonoContext } from "@lucidcms/core/types";

/** Reads Cloudflare's trusted `cf-connecting-ip` header, ignoring other forwarding headers. */
const getCloudflareConnInfo = (c: LucidHonoContext) => {
	//* only local development can be missing it
	const address = c.req.header("cf-connecting-ip") || "127.0.0.1";
	const addressType: "IPv6" | "IPv4" = address.includes(":") ? "IPv6" : "IPv4";

	return {
		address,
		port: undefined,
		addressType,
	};
};

export default getCloudflareConnInfo;
