import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getMediaAdapter from "./get-adapter.js";
import type { MediaAdapterInstance } from "./types.js";

/** Resolve the configured media adapter and run its init lifecycle hook. */
export const getInitializedMediaAdapter = async (
	config: Config,
	options: {
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<MediaAdapterInstance | null> => {
	const adapter = await getMediaAdapter(config);
	if (!adapter) return null;

	await adapter.lifecycle?.init?.(
		createAdapterLifecycleContext({
			config,
			env: options.env,
			runtimeContext: options.runtimeContext,
		}),
	);

	return adapter;
};

/** Run a media adapter destroy lifecycle hook when one exists. */
export const destroyMediaAdapter = async (
	adapter: MediaAdapterInstance | null | undefined,
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
