import type { GetEnvVarsLogger } from "@lucidcms/core/types";
import { cloudflare as createCloudflareRuntime } from "./runtime.js";
import type {
	CloudflareAdapterOptionsValue,
	CloudflareRuntimeAdapter,
} from "./types.js";

const cloudflare = (
	options?: CloudflareAdapterOptionsValue,
): CloudflareRuntimeAdapter => {
	const runtime = createCloudflareRuntime(options);

	runtime.getEnvVars = async ({ logger }: { logger: GetEnvVarsLogger }) => {
		const { default: getEnvVars } = await import("./services/get-env-vars.js");
		const initialOptions = typeof options === "function" ? undefined : options;
		const initialResult = await getEnvVars({
			logger,
			options: initialOptions,
		});
		await runtime.resolveOptions(initialResult.env);

		const resolvedOptions = runtime.getOptions();
		if (typeof options === "function" && resolvedOptions?.platformProxy) {
			await initialResult.platformProxy.dispose?.();
			const resolvedResult = await getEnvVars({
				logger,
				options: resolvedOptions,
			});
			runtime.setPlatformProxy(resolvedResult.platformProxy);
			return resolvedResult.env;
		}

		runtime.setPlatformProxy(initialResult.platformProxy);
		return initialResult.env;
	};

	runtime.cli = {
		serve: async (props) => {
			const { default: serveCommand } = await import("./cli/serve.js");
			return serveCommand(
				runtime.getOptions(),
				runtime.getPlatformProxy(),
			)(props);
		},
		build: async (props) => {
			const { default: buildCommand } = await import("./cli/build.js");
			return buildCommand(props);
		},
	};

	return runtime;
};

export default cloudflare;
