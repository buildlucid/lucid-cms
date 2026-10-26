import type { EnvironmentVariables } from "@lucidcms/core/types";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import adaptConfig from "./services/adapt-config.js";
import type {
	AdapterOptions,
	CloudflareAdapterOptionsValue,
	CloudflareRuntimeAdapter,
} from "./types.js";

/** Creates the Cloudflare runtime for `defineConfig` with options from environment values, using `@lucidcms/runtime-cloudflare/vite` to run, build and execute Lucid commands in the Worker. */
export const cloudflare = (
	options?: CloudflareAdapterOptionsValue,
): CloudflareRuntimeAdapter => {
	let resolvedOptions: AdapterOptions | undefined =
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
		vite: "@lucidcms/runtime-cloudflare/vite",
		config: {
			customBuildArtifacts: [constants.WORKER_HANDLER_ARTIFACT_TYPE],
			customPrepareArtifacts: [constants.BINDINGS_ARTIFACT_TYPE],
		},
		adaptConfig,
		getOptions: () => resolvedOptions,
		resolveOptions,
	};
};
