import type { ResolvedLucidConfig } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getKVAdapter from "./get-adapter.js";
import type { KVAdapterInstance } from "./types.js";

/** Resolve or use a supplied KV adapter and run its init hook. */
export const getInitializedKVAdapter = async (
	config: ResolvedLucidConfig,
	options: {
		adapter?: KVAdapterInstance;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<KVAdapterInstance> => {
	const adapter = options.adapter ?? (await getKVAdapter(config));
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

/** Run a KV adapter destroy lifecycle hook when one exists. */
export const destroyKVAdapter = async (
	adapter: KVAdapterInstance | undefined,
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
