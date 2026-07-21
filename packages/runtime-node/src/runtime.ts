import type { EnvironmentVariables } from "@lucidcms/core/types";
import { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import configureLucid from "./services/configure-lucid.js";
import type {
	NodeAdapterOptions,
	NodeAdapterOptionsValue,
	NodeRuntimeAdapter,
} from "./types.js";

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
		hosts: {
			astro: {
				entrypoint: "@lucidcms/runtime-node/astro",
			},
		},
		configureLucid,
		getEnvVars: async ({ logger }) => {
			const { default: getEnvVars } = await import(
				"./services/get-env-vars.js"
			);
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

export { default as getRuntimeContext } from "./services/runtime-context.js";
