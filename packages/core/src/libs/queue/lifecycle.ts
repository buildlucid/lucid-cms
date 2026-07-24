import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getQueueAdapter from "./get-adapter.js";
import type { QueueAdapterInstance } from "./types.js";

/** Resolve the configured queue adapter and run its init lifecycle hook. */
export const getInitializedQueueAdapter = async (
	config: Config,
	options: {
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<QueueAdapterInstance> => {
	const adapter = await getQueueAdapter(config, options.runtimeContext);
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

/** Run a queue adapter destroy lifecycle hook when one exists. */
export const destroyQueueAdapter = async (
	adapter: QueueAdapterInstance | undefined,
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
