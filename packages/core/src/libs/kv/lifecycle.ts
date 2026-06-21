import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getKVAdapter from "./get-adapter.js";
import type { KVAdapterInstance } from "./types.js";

/** Resolve the configured KV adapter and run its init lifecycle hook. */
export const getInitializedKVAdapter = async (
	config: Config,
	options: {
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<KVAdapterInstance> => {
	const adapter = await getKVAdapter(config);
	await adapter.lifecycle?.init?.(
		createAdapterLifecycleContext({
			config,
			env: options.env,
			runtimeContext: options.runtimeContext,
		}),
	);

	return adapter;
};

/** Run a KV adapter destroy lifecycle hook when one exists. */
export const destroyKVAdapter = async (
	adapter: KVAdapterInstance | undefined,
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
