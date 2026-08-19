import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getMediaStorageAdapter from "./get-adapter.js";
import type { MediaStorageAdapterInstance } from "./types.js";

/** Resolve the configured media storage adapter and run its init lifecycle hook. */
export const getInitializedMediaStorageAdapter = async (
	config: Config,
	options: {
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<MediaStorageAdapterInstance | null> => {
	const adapter = await getMediaStorageAdapter(config);
	if (!adapter) return null;

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

/** Run a media storage adapter destroy lifecycle hook when one exists. */
export const destroyMediaStorageAdapter = async (
	adapter: MediaStorageAdapterInstance | null | undefined,
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
