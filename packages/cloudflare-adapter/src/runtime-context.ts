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

export default runtimeContext;
