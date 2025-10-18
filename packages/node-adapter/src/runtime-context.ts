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
	support: {
		notices: {
			emailAdapter: [
				{
					key: "passthrough",
					message:
						"You are currently using the email passthrough adapter. This means emails will not be sent and just stored in the database.",
				},
			],
		},
	},
} satisfies AdapterRuntimeContext;

export default runtimeContext;
