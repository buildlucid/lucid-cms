import type { RuntimeAdapter } from "@lucidcms/core/types";
import { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import type { NodeAdapterOptions } from "./types.js";

const adapter = (options?: NodeAdapterOptions): RuntimeAdapter => ({
	key: ADAPTER_KEY,
	lucid: LUCID_VERSION,
	getEnvVars: async ({ logger }) => {
		const { default: getEnvVars } = await import("./services/get-env-vars.js");
		return getEnvVars({
			logger,
		});
	},
	cli: {
		serve: async (props) => {
			const { default: serveCommand } = await import("./cli/serve.js");
			return serveCommand(options)(props);
		},
		build: async (props) => {
			const { default: buildCommand } = await import("./cli/build.js");
			return buildCommand(props);
		},
	},
});

export default adapter;
