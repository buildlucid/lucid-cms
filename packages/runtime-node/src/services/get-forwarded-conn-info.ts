import type { LucidHonoContext } from "@lucidcms/core/types";

/** Reads the client's address from forwarding headers, for requests a host's server passes on without their Node socket. */
const getForwardedConnInfo = (context: LucidHonoContext) => {
	const { headers } = context.req.raw;
	const address =
		headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		headers.get("x-real-ip") ||
		headers.get("cf-connecting-ip") ||
		"127.0.0.1";

	return {
		address,
		addressType: address.includes(":") ? ("IPv6" as const) : ("IPv4" as const),
	};
};

export default getForwardedConnInfo;
