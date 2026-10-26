import type { AdapterRuntimeContext } from "@lucidcms/core/types";
import { ADAPTER_KEY } from "../constants.js";
import getCloudflareConnInfo from "../utils/cloudflare-conn-info.js";

/** Describes runtime capabilities and request connection information, with `compiled` matching whether source or built code is running. */
const getRuntimeContext = (params: {
	compiled: boolean;
	/** Defaults to `lucid`, Lucid's own server. */
	host?: string;
	pluginModules?: Record<string, unknown>;
}) =>
	({
		runtime: ADAPTER_KEY,
		host: params.host ?? "lucid",
		compiled: params.compiled,
		getConnectionInfo: getCloudflareConnInfo,
		support: {
			unsupported: {
				databaseAdapter: [
					{
						key: "sqlite",
						message:
							"The SQLite database adapter is not supported in Cloudflare Workers.",
					},
				],
				kvAdapter: [
					{
						key: "sqlite",
						message:
							"The SQLite KV adapter is not supported in Cloudflare Workers, so Lucid uses the passthrough adapter.",
					},
				],
				mediaStorageAdapter: [
					{
						key: "file-system",
						message:
							"The media file system adapter is not supported in Cloudflare Workers, so media features are disabled.",
					},
				],
				queueAdapter: [
					{
						key: "worker",
						message:
							"The queue worker adapter is not supported in Cloudflare Workers. Consider using the passthrough adapter for immediate execution of jobs.",
					},
				],
			},
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
		buildModule: null,
		pluginModules: params.pluginModules,
	}) satisfies AdapterRuntimeContext;

export default getRuntimeContext;
