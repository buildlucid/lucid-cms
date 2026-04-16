import type z from "zod";
import type { Config } from "../../types/config.js";
import {
	getAdapterDefineConfig,
	getAdapterEnv,
	getAdapterRootModule,
	getAdapterRuntime,
} from "../runtime-adapter/loaders.js";
import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdapter,
	RuntimeAdapterEnvLoadResult,
} from "../runtime-adapter/types.js";
import processConfig from "./process-config.js";

const defaultLoggerInstance = {
	info: () => {},
	warn: () => {},
	error: () => {},
	log: () => {},
	success: () => {},
	color: {
		blue: (value: unknown) => String(value),
	},
} as unknown as GetEnvVarsLogger["instance"];

export const invalidConfigDefinitionMessage =
	"Lucid config must default export defineConfig({ adapter, config }).";

export type ResolveConfigDefinitionResult = {
	config: Config;
	adapter?: RuntimeAdapter;
	envSchema?: z.ZodType;
	env: EnvironmentVariables | undefined;
	definition: LucidConfigDefinition;
	adapterEnvResult?: RuntimeAdapterEnvLoadResult;
};

const isConfigDefinition = (
	value: unknown,
): value is LucidConfigDefinition<string> => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const definition = value as {
		adapter?: { from?: unknown };
		env?: unknown;
		config?: unknown;
	};

	return (
		typeof definition.adapter?.from === "string" &&
		typeof definition.config === "function"
	);
};

/**
 * Config modules should stay declarative. This guard keeps the failure focused
 * on the public config shape before Lucid attempts any adapter resolution.
 */
const assertConfigDefinition = (
	value: unknown,
): LucidConfigDefinition<string> => {
	if (!isConfigDefinition(value)) {
		throw new Error(invalidConfigDefinitionMessage);
	}

	return value;
};

/**
 * Config resolution is the one place where Lucid has to bridge descriptor
 * metadata, adapter env loading, wrapper semantics and final config processing.
 * The work is staged so hosted runtimes can skip the adapter capabilities they
 * already own, like runtime env injection or CLI handlers.
 */
export const resolveConfigDefinition = async (props: {
	definition: unknown;
	envSchema?: z.ZodType;
	meta?: LucidConfigDefinitionMeta;
	env?: EnvironmentVariables;
	defineConfigPath?: string;
	logger?: GetEnvVarsLogger;
	loadRuntime?: boolean;
	processConfigOptions?: Parameters<typeof processConfig>[1];
}): Promise<ResolveConfigDefinitionResult> => {
	const definition = assertConfigDefinition(props.definition);
	const adapterRootModule = await getAdapterRootModule(definition.adapter.from);

	// Hosted integrations can supply their own defineConfig wrapper so the
	// runtime adapter identity stays separate from host-specific config shaping.
	const defineConfig =
		props.defineConfigPath && props.defineConfigPath !== definition.adapter.from
			? await getAdapterDefineConfig(props.defineConfigPath)
			: adapterRootModule.defineConfig;

	const wrappedDefinition = defineConfig(definition, props.meta);
	const logger = props.logger ?? {
		instance: defaultLoggerInstance,
		silent: true,
	};
	// Env loading is optional because some hosts, like Astro Cloudflare, already
	// own the runtime bindings and can pass them in directly.
	const adapterEnvResult =
		props.env === undefined
			? await getAdapterEnv(wrappedDefinition.adapter, {
					logger,
				})
			: undefined;
	const env = props.env ?? adapterEnvResult?.env;
	const envSchema = props.envSchema;

	if (envSchema && env) {
		envSchema.parse(env);
	}

	// processConfig remains the shared source of truth for plugin init, merging
	// and validation once the adapter/env/bootstrap layer has been resolved.
	const config = await processConfig(wrappedDefinition.config(env || {}), {
		bypassCache: true,
		...(props.processConfigOptions ?? {}),
	});
	const adapter = props.loadRuntime
		? await getAdapterRuntime(wrappedDefinition.adapter)
		: undefined;

	return {
		config,
		adapter,
		envSchema,
		env,
		definition: wrappedDefinition,
		adapterEnvResult,
	};
};

export default resolveConfigDefinition;
