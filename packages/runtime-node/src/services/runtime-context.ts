import { getConnInfo } from "@hono/node-server/conninfo";
import type {
	AdapterRuntimeContext,
	LucidHonoContext,
} from "@lucidcms/core/types";
import { ADAPTER_KEY } from "../constants.js";

/** Describes the runtime capabilities and request connection information. Set compiled to match whether source or built code is running. */
const getRuntimeContext = (params: {
	compiled: boolean;
	/** Defaults to `lucid`, Lucid's own server. */
	host?: string;
	pluginData?: Record<string, unknown>;
	pluginModules?: Record<string, unknown>;
}) =>
	({
		runtime: ADAPTER_KEY,
		host: params.host ?? "lucid",
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
		configEntryPoint: "lucid/config.js",
		pluginData: params.pluginData,
		pluginModules: params.pluginModules,
	}) satisfies AdapterRuntimeContext;

export default getRuntimeContext;
