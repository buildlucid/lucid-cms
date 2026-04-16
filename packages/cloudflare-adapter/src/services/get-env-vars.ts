import type {
	EnvironmentVariables,
	RuntimeAdapter,
} from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";
import type { AdapterOptions } from "../types.js";
import dynamicImport from "../utils/dynamic-import.js";

type GetEnvVarsLogger = Parameters<RuntimeAdapter["getEnvVars"]>[0]["logger"];

const getEnvVars = async (props: {
	logger: GetEnvVarsLogger;
	options?: AdapterOptions;
}): Promise<{
	env: EnvironmentVariables;
	platformProxy: PlatformProxy;
}> => {
	if (props.options?.platformProxy?.environment) {
		props.logger.instance.info(
			"Loading Cloudflare bindings from the",
			props.logger.instance.color.blue(props.options.platformProxy.environment),
			"environment",
			{
				silent: props.logger.silent,
			},
		);
	} else {
		props.logger.instance.info(
			"Loading Cloudflare bindings from wrangler default configuration. If using env-specific bindings (KV, Queues), configure via platformProxy.environment option.",
			{
				silent: props.logger.silent,
			},
		);
	}

	// Keep Wrangler opaque to host bundlers so Astro config loading does not
	// try to prebundle Wrangler's heavier internals.
	const { getPlatformProxy } =
		await dynamicImport<typeof import("wrangler")>("wrangler");
	const platformProxy = await getPlatformProxy(props.options?.platformProxy);

	return {
		env: platformProxy.env as EnvironmentVariables,
		platformProxy,
	};
};

export default getEnvVars;
