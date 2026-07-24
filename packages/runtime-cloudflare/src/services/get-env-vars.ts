import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
} from "@lucidcms/core/types";
import {
	type GetPlatformProxyOptions,
	getPlatformProxy,
	type PlatformProxy,
} from "wrangler";

const platformProxySignals = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

const captureSignalListeners = () =>
	new Map(
		platformProxySignals.map((signal) => [
			signal,
			new Set(process.listeners(signal)),
		]),
	);

const removeAddedSignalListeners = (
	previousListeners: ReturnType<typeof captureSignalListeners>,
) => {
	for (const signal of platformProxySignals) {
		const previous = previousListeners.get(signal);
		for (const listener of process.listeners(signal)) {
			if (!previous?.has(listener)) {
				process.removeListener(signal, listener);
			}
		}
	}
};

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

	const signalListeners = captureSignalListeners();
	let platformProxy: PlatformProxy;
	try {
		platformProxy = await getPlatformProxy(props.platformProxy);
	} finally {
		// Lucid owns this proxy and disposes it during runtime shutdown. Wrangler's
		// signal handlers exit first and would otherwise skip Lucid's async cleanup.
		removeAddedSignalListeners(signalListeners);
	}

	return {
		env: platformProxy.env as EnvironmentVariables,
		platformProxy,
	};
};

export default getEnvVars;
