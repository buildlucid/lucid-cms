import type { LucidHonoContext } from "@lucidcms/core/types";

/** Uses the host's `clientAddress` because hosted requests lack a Node socket. */
const getHostedConnInfo = (c: LucidHonoContext) => {
	const address = (c.env as { clientAddress?: string } | undefined)
		?.clientAddress;

	return {
		address,
		addressType: address?.includes(":") ? ("IPv6" as const) : ("IPv4" as const),
	};
};

export default getHostedConnInfo;
