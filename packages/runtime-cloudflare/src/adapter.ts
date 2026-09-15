import type { GetEnvVarsLogger } from "@lucidcms/core/types";
import { cloudflare as createCloudflareRuntime } from "./runtime.js";
import type {
	CloudflareAdapterOptionsValue,
	CloudflareRuntimeAdapter,
} from "./types.js";

/** Creates the Cloudflare runtime for defineConfig, including CLI development and build support. Options may be resolved from environment values. */
const cloudflare = (
	options?: CloudflareAdapterOptionsValue,
): CloudflareRuntimeAdapter => {
	const runtime = createCloudflareRuntime(options);

	runtime.getEnvVars = async ({ logger }: { logger: GetEnvVarsLogger }) => {
		const { default: loadEnvVars } = await import(
			"./services/load-env-vars.js"
		);

		return loadEnvVars({
			logger,
			optionsValue: options,
			runtime,
			prepared: runtime.getPreparedWranglerConfig(),
			setPreparedWranglerConfig: runtime.setPreparedWranglerConfig,
		});
	};

	runtime.cli = {
		dispose: async () => {
			const proxy = runtime.getPlatformProxy();
			runtime.setPlatformProxy(undefined);
			await proxy?.dispose();
		},
		prepare: async (props) => {
			const { default: prepareCommand } = await import("./cli/prepare.js");
			return prepareCommand(runtime.getOptions(), {
				setPreparedWranglerConfig: runtime.setPreparedWranglerConfig,
			})(props);
		},
		serve: async (props) => {
			const { default: serveCommand } = await import("./cli/serve.js");
			return serveCommand(
				runtime.getOptions(),
				runtime.getPlatformProxy(),
			)(props);
		},
		build: async (props) => {
			const { default: buildCommand } = await import("./cli/build.js");
			return buildCommand(
				runtime.getOptions(),
				runtime.getPreparedWranglerConfig()?.prepareArtifacts,
			)(props);
		},
	};

	return runtime;
};

export default cloudflare;
