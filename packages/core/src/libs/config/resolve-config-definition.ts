import type z from "zod";
import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import { getConfigureLucidModule } from "../runtime/loaders.js";
import { resolveDatabaseAdapter } from "../runtime/resolve-database-adapter.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	GetEnvVarsLogger,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdapter,
	WrappedLucidConfigDefinition,
} from "../runtime/types.js";
import processConfig from "./process-config.js";

const defaultLoggerInstance = {
	info: () => {},
	warn: () => {},
	error: () => {},
	log: () => {},
	success: () => {},
	color: {
		blue: (value: unknown) => String(value),
		green: (value: unknown) => String(value),
	},
} as unknown as GetEnvVarsLogger["instance"];

export const invalidConfigDefinitionMessage =
	"Lucid config must default export configureLucid({ runtime, db, config }).";

export type ResolveConfigDefinitionResult = {
	config: Config;
	adapter: RuntimeAdapter;
	runtimeContext: AdapterRuntimeContext;
	envSchema?: z.ZodType;
	env: EnvironmentVariables | undefined;
	definition: WrappedLucidConfigDefinition;
};

const isConfigDefinition = (value: unknown): value is LucidConfigDefinition => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const definition = value as {
		runtime?: unknown;
		db?: unknown;
		config?: unknown;
	};

	return (
		definition.runtime !== undefined &&
		definition.db !== undefined &&
		typeof definition.config === "function"
	);
};

/**
 * Config modules should stay declarative. This guard keeps the failure focused
 * on the public config shape before Lucid attempts any adapter resolution.
 */
const assertConfigDefinition = (value: unknown): LucidConfigDefinition => {
	if (!isConfigDefinition(value)) {
		throw new LucidError({
			message: invalidConfigDefinitionMessage,
		});
	}

	return value;
};

const resolveRuntimeAdapter = async (
	runtime: LucidConfigDefinition["runtime"],
): Promise<RuntimeAdapter> => {
	const adapter = typeof runtime === "function" ? runtime() : runtime;
	const resolved = await adapter;

	if (!resolved || typeof resolved !== "object") {
		throw new LucidError({
			message:
				"Lucid could not resolve the configured runtime adapter. Pass a runtime adapter instance to `configureLucid({ runtime })`.",
		});
	}

	return resolved;
};

/**
 * Config resolution is the one place where Lucid bridges direct adapter values,
 * env loading, wrapper semantics and final config processing.
 */
export const resolveConfigDefinition = async (props: {
	definition: unknown;
	envSchema?: z.ZodType;
	meta?: LucidConfigDefinitionMeta;
	env?: EnvironmentVariables;
	configureLucidPath?: string;
	configPath?: string;
	projectRoot?: string;
	logger?: GetEnvVarsLogger;
	processConfigOptions?: Parameters<typeof processConfig>[1];
}): Promise<ResolveConfigDefinitionResult> => {
	const definition = assertConfigDefinition(props.definition);
	const adapter = await resolveRuntimeAdapter(definition.runtime);
	const logger = props.logger ?? {
		instance: defaultLoggerInstance,
		silent: true,
	};

	if (adapter.cli?.prepare && props.configPath && props.projectRoot) {
		await adapter.cli.prepare({
			configPath: props.configPath,
			projectRoot: props.projectRoot,
			logger,
		});
	}
	const runtimeContext = {
		runtime: adapter.key,
		compiled: false,
		getConnectionInfo: () => ({}),
		configEntryPoint: null,
	} satisfies AdapterRuntimeContext;

	// Hosted integrations can supply their own configureLucid wrapper so the
	// runtime adapter identity stays separate from host-specific config shaping.
	const configureLucid = props.configureLucidPath
		? await getConfigureLucidModule(props.configureLucidPath)
		: (adapter.configureLucid ?? ((value) => value));

	const wrappedDefinition = configureLucid(
		{
			...definition,
			runtime: adapter,
		},
		props.meta,
	);
	// Env loading is optional because some hosts, like Astro Cloudflare, already
	// own request-time env loading and can pass it in directly.
	const env =
		props.env ??
		(adapter.getEnvVars
			? await adapter.getEnvVars({
					logger,
				})
			: undefined);
	const envSchema = wrappedDefinition.env ?? props.envSchema;

	if (envSchema && env) {
		envSchema.parse(env);
	}

	await adapter.resolveOptions?.(env ?? {});

	const db = await resolveDatabaseAdapter(wrappedDefinition.db, env);

	// processConfig remains the shared source of truth for plugin init, merging
	// and validation once the adapter/env/bootstrap layer has been resolved.
	const config = await processConfig(wrappedDefinition.config(env || {}), {
		...(props.processConfigOptions ?? {}),
		recipe: wrappedDefinition.recipe,
		resolvedDb: db,
	});

	return {
		config,
		adapter,
		runtimeContext,
		envSchema,
		env,
		definition: wrappedDefinition,
	};
};

export default resolveConfigDefinition;
