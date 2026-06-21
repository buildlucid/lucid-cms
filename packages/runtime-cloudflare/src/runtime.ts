import type { EnvironmentVariables } from "@lucidcms/core/types";
import constants, { ADAPTER_KEY, LUCID_VERSION } from "./constants.js";
import configureLucid from "./services/configure-lucid.js";
import type {
	AdapterOptions,
	CloudflareAdapterOptionsValue,
	CloudflareRuntimeAdapter,
	PreparedWranglerConfig,
} from "./types.js";

export const cloudflare = (
	options?: CloudflareAdapterOptionsValue,
): CloudflareRuntimeAdapter => {
	let resolvedOptions: AdapterOptions | undefined =
		typeof options === "function" ? undefined : options;
	let optionsResolved = typeof options !== "function";
	let platformProxy: ReturnType<CloudflareRuntimeAdapter["getPlatformProxy"]>;
	let preparedWranglerConfig: PreparedWranglerConfig | undefined;

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
		config: {
			customBuildArtifacts: [constants.WORKER_EXPORT_ARTIFACT_TYPE],
		},
		configureLucid,
		getOptions: () => resolvedOptions,
		resolveOptions,
		getPlatformProxy: () => platformProxy,
		setPlatformProxy: (nextPlatformProxy) => {
			platformProxy = nextPlatformProxy;
		},
		getPreparedWranglerConfig: () => preparedWranglerConfig,
		setPreparedWranglerConfig: (nextConfig) => {
			preparedWranglerConfig = nextConfig;
		},
	};
};

export { default as getRuntimeContext } from "./services/get-runtime-context.js";
