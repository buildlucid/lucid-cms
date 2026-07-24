import type { Config } from "../../types/config.js";
import { createAdapterLifecycleContext } from "../runtime/adapter-lifecycle.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../runtime/types.js";
import getImageProcessor from "./get-adapter.js";
import type { ImageProcessorInstance } from "./types.js";

/** Resolve the configured image processor and run its init lifecycle hook. */
export const getInitializedImageProcessor = async (
	config: Config,
	options: {
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	} = {},
): Promise<ImageProcessorInstance> => {
	const processor = await getImageProcessor(config);
	const context = createAdapterLifecycleContext({
		config,
		env: options.env,
		runtimeContext: options.runtimeContext,
	});

	try {
		await processor.lifecycle?.init?.(context);
	} catch (error) {
		await Promise.allSettled([processor.lifecycle?.destroy?.(context)]);
		throw error;
	}

	return processor;
};

/** Run an image processor destroy lifecycle hook when one exists. */
export const destroyImageProcessor = async (
	processor: ImageProcessorInstance | undefined,
	options: {
		config: Config;
		env?: EnvironmentVariables;
		runtimeContext?: AdapterRuntimeContext;
	},
): Promise<void> => {
	if (!processor) return;

	await processor.lifecycle?.destroy?.(
		createAdapterLifecycleContext({
			config: options.config,
			env: options.env,
			runtimeContext: options.runtimeContext,
		}),
	);
};
