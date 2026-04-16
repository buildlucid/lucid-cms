import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
} from "@lucidcms/core/types";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import type { AdapterOptions } from "./types.js";

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

	const platformProxy = await getPlatformProxy(props.options?.platformProxy);

	return {
		env: platformProxy.env as EnvironmentVariables,
		platformProxy,
	};
};

export default getEnvVars;
export { getEnvVars };
