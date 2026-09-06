import type { ResolvedLucidConfig } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getEmailAdapter from "./get-adapter.js";
import type { EmailAdapterInstance } from "./types.js";

/** Resolve or use a supplied email adapter and run its init hook. */
export const getInitializedEmailAdapter = async (
	config: ResolvedLucidConfig,
	options: {
		adapter?: EmailAdapterInstance;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<EmailAdapterInstance> => {
	const adapter = options.adapter ?? (await getEmailAdapter(config));
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

/** Run an email adapter destroy lifecycle hook when one exists. */
export const destroyEmailAdapter = async (
	adapter: EmailAdapterInstance | undefined,
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
