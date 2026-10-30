import type { EnvironmentVariables } from "@lucidcms/core/types";
import { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import adaptConfig from "./services/adapt-config.js";
import type {
	NodeAdapterOptions,
	NodeAdapterOptionsValue,
	NodeRuntimeAdapter,
} from "./types.js";

/** Creates the Node runtime for `defineConfig` with options from environment values, using `@lucidcms/runtime-node/vite` to run and build it. */
export const node = (options?: NodeAdapterOptionsValue): NodeRuntimeAdapter => {
	let resolvedOptions: NodeAdapterOptions | undefined =
		typeof options === "function" ? undefined : options;
	let optionsResolved = typeof options !== "function";

	const resolveOptions = async (env: EnvironmentVariables) => {
		if (optionsResolved) {
			return;
		}
		if (typeof options !== "function") {
			optionsResolved = true;
			return;
		}

		resolvedOptions = await options(env);
		optionsResolved = true;
	};

	return {
		key: ADAPTER_KEY,
		lucid: LUCID_VERSION,
		vite: "@lucidcms/runtime-node/vite",
		adaptConfig,
		getEnvVars: async ({ logger }) => {
			const { default: getEnvVars } =
				await import("./services/get-env-vars.js");
			const env = await getEnvVars({
				logger,
			});

			await resolveOptions(env);
			return env;
		},
		getOptions: () => resolvedOptions,
		resolveOptions,
	};
};

export { default as createNodeJobScheduler } from "./services/create-node-job-scheduler.js";
