import type { ResolvedLucidConfig } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getQueueAdapter from "./get-adapter.js";
import type { QueueAdapterInstance } from "./types.js";

/** Resolve or use a supplied queue adapter and run its init hook. */
export const getInitializedQueueAdapter = async (
	config: ResolvedLucidConfig,
	options: {
		adapter?: QueueAdapterInstance;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<QueueAdapterInstance> => {
	const adapter = options.adapter ?? (await getQueueAdapter(config));
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
		config: ResolvedLucidConfig;
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
