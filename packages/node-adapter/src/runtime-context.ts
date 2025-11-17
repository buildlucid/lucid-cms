import type {
	LucidHonoContext,
	AdapterRuntimeContext,
} from "@lucidcms/core/types";
import { getConnInfo } from "@hono/node-server/conninfo";
import constants, { ADAPTER_KEY } from "./constants.js";

const getRuntimeContext = (params: { compiled: boolean }) =>
	({
		runtime: ADAPTER_KEY,
		compiled: params.compiled,
		getConnectionInfo: (c: LucidHonoContext) => getConnInfo(c).remote,
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
		configEntryPoint: constants.CONFIG_FILE,
	}) satisfies AdapterRuntimeContext;

export default getRuntimeContext;
