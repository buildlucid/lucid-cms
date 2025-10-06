import type {
	LucidHonoContext,
	AdapterRuntimeContext,
} from "@lucidcms/core/types";
import { getConnInfo } from "@hono/node-server/conninfo";

const runtimeContext = {
	getConnectionInfo: (c: LucidHonoContext) => {
		const connectionInfo = getConnInfo(c);
		return connectionInfo.remote;
	},
} satisfies AdapterRuntimeContext;

export default runtimeContext;
