import type {
	LucidHonoContext,
	AdapterRuntimeContext,
} from "@lucidcms/core/types";
import { getConnInfo as getConnInfoNode } from "@hono/node-server/conninfo";
import { getConnInfo as getConnInfoCloudflare } from "hono/cloudflare-workers";
import { ADAPTER_KEY } from "./constants.js";

const getRuntimeContext = (params: {
	server: "node" | "cloudflare";
	compiled: boolean;
}) =>
	({
		runtime: ADAPTER_KEY,
		compiled: params.compiled,
		getConnectionInfo:
			params.server === "node"
				? (c: LucidHonoContext) => getConnInfoNode(c).remote
				: (c: LucidHonoContext) => getConnInfoCloudflare(c).remote,
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
				mediaAdapter: [
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
		configEntryPoint: null,
	}) satisfies AdapterRuntimeContext;

export default getRuntimeContext;
