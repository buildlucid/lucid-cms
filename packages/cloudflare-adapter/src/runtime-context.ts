import type {
	LucidHonoContext,
	AdapterRuntimeContext,
} from "@lucidcms/core/types";
import { getConnInfo as getConnInfoNode } from "@hono/node-server/conninfo";
import { getConnInfo as getConnInfoCloudflare } from "hono/cloudflare-workers";

const runtimeContext = (params: { dev: boolean }) =>
	({
		getConnectionInfo: params.dev
			? (c: LucidHonoContext) => {
					const connectionInfo = getConnInfoNode(c);
					return connectionInfo.remote;
				}
			: (c: LucidHonoContext) => {
					const connectionInfo = getConnInfoCloudflare(c);
					return connectionInfo.remote;
				},
	}) satisfies AdapterRuntimeContext;

export default runtimeContext;
