import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getMediaDeliveryAdapter from "./get-adapter.js";
import type { MediaDeliveryAdapterInstance } from "./types.js";

/** Resolve or use a supplied media delivery adapter and run its init hook. */
export const getInitializedMediaDeliveryAdapter = async (
	config: Config,
	options: {
		adapter?: MediaDeliveryAdapterInstance;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<MediaDeliveryAdapterInstance> => {
	const adapter = options.adapter ?? (await getMediaDeliveryAdapter(config));
	const context = createAdapterLifecycleContext({
		config,
		env: options.env,
		runtimeContext: options.runtimeContext,
	});

	try {
		await adapter.lifecycle?.init?.(context);
	} catch (error) {
		await Promise.allSettled([adapter.lifecycle?.destroy?.(context)]);
		throw error;
	}

	return adapter;
};

/** Run a media delivery adapter destroy hook when one exists. */
export const destroyMediaDeliveryAdapter = async (
	adapter: MediaDeliveryAdapterInstance | undefined,
	options: {
		config: Config;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	},
): Promise<void> => {
	if (!adapter) return;

	await adapter.lifecycle?.destroy?.(
		createAdapterLifecycleContext({
			config: options.config,
			env: options.env,
			runtimeContext: options.runtimeContext,
		}),
	);
};
