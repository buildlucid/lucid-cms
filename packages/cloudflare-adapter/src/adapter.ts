import type { RuntimeAdapter } from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import type { AdapterOptions } from "./types.js";

const cloudflareAdapter = (options?: AdapterOptions): RuntimeAdapter => {
	let platformProxy: PlatformProxy | undefined;

	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		config: {
			customBuildArtifacts: [
				constants.WORKER_EXPORT_ARTIFACT_TYPE,
				constants.WORKER_ENTRY_ARTIFACT_TYPE,
			],
		},
		getEnvVars: async ({ logger }) => {
			const { default: getEnvVars } = await import(
				"./services/get-env-vars.js"
			);
			const result = await getEnvVars({
				logger,
				options,
			});
			platformProxy = result.platformProxy;
			return result.env;
		},
		cli: {
			// Keep the adapter entry lightweight so hosted Cloudflare runtimes do
			// not eagerly pull wrangler or Node-only CLI code into their graph.
			serve: async (props) => {
				const { default: serveCommand } = await import("./cli/serve.js");
				return serveCommand(options, platformProxy)(props);
			},
			build: async (props) => {
				const { default: buildCommand } = await import("./cli/build.js");
				return buildCommand(props);
			},
		},
	};
};

export default cloudflareAdapter;
