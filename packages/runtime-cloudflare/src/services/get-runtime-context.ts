import type { AdapterRuntimeContext } from "@lucidcms/core/types";
import { ADAPTER_KEY } from "../constants.js";
import getCloudflareConnInfo from "../utils/cloudflare-conn-info.js";
import getNodeConnInfo from "../utils/node-conn-info.js";

/** Describes the runtime capabilities and request connection information. Set compiled to match whether source or built code is running. */
const getRuntimeContext = (params: {
	server: "node" | "cloudflare";
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
		getConnectionInfo:
			params.server === "node" ? getNodeConnInfo : getCloudflareConnInfo,
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
							"The SQLite KV adapter is not supported in Cloudflare Workers. This will fall back to the passthrough adapter when using Wrangler or once deployed.",
					},
				],
				mediaStorageAdapter: [
					{
						key: "file-system",
						message:
							"The media file system adapter is not supported in Cloudflare Workers. When using Wrangler or once deployed, the media featured will be disabled.",
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
		pluginData: params.pluginData,
		pluginModules: params.pluginModules,
	}) satisfies AdapterRuntimeContext;

export default getRuntimeContext;
