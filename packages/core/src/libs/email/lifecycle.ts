import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterLifecyclePurpose,
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getEmailAdapter from "./get-adapter.js";
import type { EmailAdapterInstance } from "./types.js";

/** Resolve the configured email adapter and run its init lifecycle hook. */
export const getInitializedEmailAdapter = async (
	config: Config,
	options: {
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
		purpose?: AdapterLifecyclePurpose;
	} = {},
): Promise<EmailAdapterInstance> => {
	const adapter = await getEmailAdapter(config);
	const context = createAdapterLifecycleContext({
		config,
		env: options.env,
		runtimeContext: options.runtimeContext,
		purpose: options.purpose,
	});

	try {
		await adapter.lifecycle?.init?.(context);
	} catch (error) {
		await Promise.allSettled([adapter.lifecycle?.destroy?.(context)]);
		throw error;
	}

	return adapter;
};

/** Run an email adapter destroy lifecycle hook when one exists. */
export const destroyEmailAdapter = async (
	adapter: EmailAdapterInstance | undefined,
	options: {
		config: Config;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
		purpose?: AdapterLifecyclePurpose;
	},
): Promise<void> => {
	if (!adapter) return;

	await adapter.lifecycle?.destroy?.(
		createAdapterLifecycleContext({
			config: options.config,
			env: options.env,
			runtimeContext: options.runtimeContext,
			purpose: options.purpose,
		}),
	);
};
