import path from "node:path";
import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
	RuntimePrepareArtifacts,
} from "@lucidcms/core/types";
import type {
	AdapterOptions,
	CloudflareAdapterOptionsValue,
	CloudflareRuntimeAdapter,
	PreparedWranglerConfig,
} from "../types.js";
import getEnvVars from "./get-env-vars.js";
import writeWranglerConfig from "./write-wrangler-config.js";

/** Mirrors Wrangler's local env file lookup when Lucid supplies a generated config. */
const getPreparedEnvFiles = (
	projectRoot: string | undefined,
	environment: string | undefined,
): string[] | undefined => {
	if (!projectRoot) return undefined;

	return [
		path.resolve(projectRoot, ".env"),
		path.resolve(projectRoot, ".env.local"),
		...(environment
			? [
					path.resolve(projectRoot, `.env.${environment}`),
					path.resolve(projectRoot, `.env.${environment}.local`),
				]
			: []),
		path.resolve(projectRoot, ".dev.vars"),
		...(environment
			? [path.resolve(projectRoot, `.dev.vars.${environment}`)]
			: []),
	];
};

/** Points platform-proxy at Lucid's prepared Wrangler config when one exists. */
const withPreparedConfig = (
	options: AdapterOptions | undefined,
	prepared: PreparedWranglerConfig | undefined,
): AdapterOptions | undefined => {
	if (!prepared) return options;
	const environment = options?.platformProxy?.environment;

	return {
		...(options ?? {}),
		platformProxy: {
			...(options?.platformProxy ?? {}),
			configPath:
				options?.platformProxy?.configPath ?? prepared.generatedConfigPath,
			envFiles:
				options?.platformProxy?.envFiles ??
				getPreparedEnvFiles(prepared.projectRoot, environment),
			remoteBindings: options?.platformProxy?.remoteBindings ?? false,
		},
	};
};

/** Rewrites the prepared Wrangler config after env-based adapter options resolve. */
const rewritePreparedWranglerConfig = async (
	options: AdapterOptions | undefined,
	prepared: PreparedWranglerConfig | undefined,
	prepareArtifacts: RuntimePrepareArtifacts | undefined,
): Promise<PreparedWranglerConfig | undefined> => {
	if (!prepared) return undefined;
	const outputPath = path.dirname(prepared.generatedConfigPath);
	const result = await writeWranglerConfig({
		configPath: prepared.configPath,
		outputPath,
		options,
		prepareArtifacts,
		target: "prepare",
	});

	if (!result.generatedConfigPath) return undefined;

	return {
		...prepared,
		generatedConfigPath: result.generatedConfigPath,
		prepareArtifacts: prepareArtifacts ?? prepared.prepareArtifacts,
	};
};

/** Detects option factories that need a second env load with resolved settings. */
const shouldReloadAfterResolve = (
	optionsValue: CloudflareAdapterOptionsValue | undefined,
	resolvedOptions: AdapterOptions | undefined,
) =>
	typeof optionsValue === "function" &&
	(resolvedOptions?.platformProxy !== undefined ||
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

	const initialOptions = withPreparedConfig(
		typeof props.optionsValue === "function" ? undefined : props.optionsValue,
		props.prepared,
	);
	const initialResult = await getEnvVars({
		logger: props.logger,
		options: initialOptions,
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
			options: withPreparedConfig(resolvedOptions, prepared),
		});
		props.runtime.setPlatformProxy(resolvedResult.platformProxy);
		return resolvedResult.env;
	}

	props.runtime.setPlatformProxy(initialResult.platformProxy);
	return initialResult.env;
};

export default loadEnvVars;
