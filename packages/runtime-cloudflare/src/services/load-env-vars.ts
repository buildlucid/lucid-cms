import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
	RuntimePrepareArtifacts,
} from "@lucidcms/core/types";
import type { GetPlatformProxyOptions } from "wrangler";
import type {
	AdapterOptions,
	CloudflareAdapterOptionsValue,
	CloudflareRuntimeAdapter,
	PreparedWranglerConfig,
} from "../types.js";
import shouldUseRemoteBindings from "../utils/remote-bindings.js";
import getEnvVars from "./get-env-vars.js";
import writeWranglerConfig from "./write-wrangler-config.js";

/** Converts Lucid runtime config into the Wrangler platform-proxy options. */
const getPlatformProxyOptions = (
	options: AdapterOptions | undefined,
	prepared: PreparedWranglerConfig | undefined,
): GetPlatformProxyOptions => {
	const configPath = prepared?.wranglerConfigPath ?? options?.wrangler;

	return {
		...(configPath ? { configPath } : {}),
		...(options?.environment ? { environment: options.environment } : {}),
		remoteBindings: shouldUseRemoteBindings(),
	};
};

/** Rewrites the prepared Wrangler config after env-based adapter options resolve. */
const rewritePreparedWranglerConfig = async (
	options: AdapterOptions | undefined,
	prepared: PreparedWranglerConfig | undefined,
	prepareArtifacts: RuntimePrepareArtifacts | undefined,
): Promise<PreparedWranglerConfig | undefined> => {
	if (!prepared) return undefined;
	const result = await writeWranglerConfig({
		configPath: prepared.lucidConfigPath,
		outputPath: prepared.projectRoot,
		options,
		prepareArtifacts,
		target: "prepare",
	});

	if (!result.configPath) return undefined;

	return {
		...prepared,
		wranglerConfigPath: result.configPath,
		generated: result.generated,
		prepareArtifacts: prepareArtifacts ?? prepared.prepareArtifacts,
	};
};

/** Detects option factories that need a second env load with resolved settings. */
const shouldReloadAfterResolve = (
	optionsValue: CloudflareAdapterOptionsValue | undefined,
	resolvedOptions: AdapterOptions | undefined,
) =>
	typeof optionsValue === "function" &&
	(resolvedOptions?.environment !== undefined ||
		resolvedOptions?.bindings !== undefined ||
		resolvedOptions?.worker !== undefined ||
		resolvedOptions?.wrangler !== undefined);

/** Loads Cloudflare env values while keeping generated Wrangler config in sync. */
const loadEnvVars = async (props: {
	logger: GetEnvVarsLogger;
	optionsValue?: CloudflareAdapterOptionsValue;
	runtime: Pick<
		CloudflareRuntimeAdapter,
		"getOptions" | "getPlatformProxy" | "resolveOptions" | "setPlatformProxy"
	>;
	prepared?: PreparedWranglerConfig;
	setPreparedWranglerConfig: (
		config: PreparedWranglerConfig | undefined,
	) => void;
}): Promise<EnvironmentVariables> => {
	await props.runtime.getPlatformProxy()?.dispose?.();
	props.runtime.setPlatformProxy(undefined);

	const initialResult = await getEnvVars({
		logger: props.logger,
		platformProxy: getPlatformProxyOptions(
			typeof props.optionsValue === "function" ? undefined : props.optionsValue,
			props.prepared,
		),
	});

	await props.runtime.resolveOptions(initialResult.env);
	const resolvedOptions = props.runtime.getOptions();

	if (shouldReloadAfterResolve(props.optionsValue, resolvedOptions)) {
		await initialResult.platformProxy.dispose?.();
		const prepared = await rewritePreparedWranglerConfig(
			resolvedOptions,
			props.prepared,
			props.prepared?.prepareArtifacts,
		);
		props.setPreparedWranglerConfig(prepared);
		const resolvedResult = await getEnvVars({
			logger: props.logger,
			platformProxy: getPlatformProxyOptions(resolvedOptions, prepared),
		});
		props.runtime.setPlatformProxy(resolvedResult.platformProxy);
		return resolvedResult.env;
	}

	props.runtime.setPlatformProxy(initialResult.platformProxy);
	return initialResult.env;
};

export default loadEnvVars;
