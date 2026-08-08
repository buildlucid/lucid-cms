import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
} from "@lucidcms/core/types";
import {
	type GetPlatformProxyOptions,
	getPlatformProxy,
	type PlatformProxy,
} from "wrangler";

const getEnvVars = async (props: {
	logger: GetEnvVarsLogger;
	platformProxy?: GetPlatformProxyOptions;
}): Promise<{
	env: EnvironmentVariables;
	platformProxy: PlatformProxy;
}> => {
	if (props.platformProxy?.environment) {
		props.logger.instance.info(
			"Loading Cloudflare bindings from the",
			props.logger.instance.color.blue(props.platformProxy.environment),
			"environment",
			{
				silent: props.logger.silent,
			},
		);
	} else {
		props.logger.instance.info(
			"Loading Cloudflare bindings from wrangler default configuration. If using env-specific bindings (KV, Queues), configure via the environment option.",
			{
				silent: props.logger.silent,
			},
		);
	}

	const platformProxy = await getPlatformProxy(props.platformProxy);

	return {
		env: platformProxy.env as EnvironmentVariables,
		platformProxy,
	};
};

export default getEnvVars;
