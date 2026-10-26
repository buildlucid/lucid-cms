import type z from "zod";
import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import parseEnv from "../runtime/parse-env.js";
import { resolveDatabaseAdapter } from "../runtime/resolve-database-adapter.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	GetEnvVarsLogger,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdapter,
} from "../runtime/types.js";
import parseAvailableEnv from "./parse-available-env.js";
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

const invalidConfigDefinitionMessage =
	"Lucid config must default export defineConfig({ runtime, db, config }).";
const supportedKeys = new Set(["runtime", "db", "config", "configure"]);

export type ResolveConfigDefinitionResult = {
	config: ResolvedLucidConfig;
	adapter: RuntimeAdapter;
	runtimeContext: AdapterRuntimeContext;
	envSchema?: z.ZodType;
	env: EnvironmentVariables | undefined;
	/** Original values for integrations that create another runtime host. */
	rawEnv: Record<string, unknown> | undefined;
	definition: LucidConfigDefinition;
};

const isConfigDefinition = (value: unknown): value is LucidConfigDefinition => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const definition = value as {
		runtime?: unknown;
		db?: unknown;
		config?: unknown;
		configure?: unknown;
	};

	return (
		definition.runtime !== undefined &&
		definition.db !== undefined &&
		typeof definition.config === "function" &&
		(definition.configure === undefined ||
			typeof definition.configure === "function")
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

	const unknownKeys = Object.keys(value).filter(
		(key) => !supportedKeys.has(key),
	);
	if (unknownKeys.length) {
		throw new LucidError({
			message: `Unknown config definition keys: ${unknownKeys.join(", ")}. Use runtime, db, config and configure.`,
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
				"Lucid could not resolve the configured runtime adapter. Pass a runtime adapter instance to `defineConfig({ runtime })`.",
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
	/** Build and CLI loaders can collect project files before plugins consume the config. */
	onRawConfig?: (config: LucidConfig) => Promise<void>;
	envSchema?: z.ZodType;
	meta?: LucidConfigDefinitionMeta;
	env?: Record<string, unknown>;
	/** Loads environment values once the adapter resolves, instead of the adapter's own `getEnvVars`. */
	loadEnv?: (
		adapter: RuntimeAdapter,
	) => Promise<Record<string, unknown> | undefined>;
	validateEnvSchema?: boolean;
	logger?: GetEnvVarsLogger;
	processConfigOptions?: Parameters<typeof processConfig>[1];
}): Promise<ResolveConfigDefinitionResult> => {
	const definition = assertConfigDefinition(props.definition);
	const adapter = await resolveRuntimeAdapter(definition.runtime);
	const logger = props.logger ?? {
		instance: defaultLoggerInstance,
		silent: true,
	};
	const runtimeContext = {
		runtime: adapter.key,
		host: "lucid",
		compiled: false,
		getConnectionInfo: () => ({}),
		buildModule: null,
	} satisfies AdapterRuntimeContext;

	const adaptConfig = adapter.adaptConfig ?? ((value) => value);

	const wrappedDefinition = adaptConfig(
		{
			...definition,
			runtime: adapter,
		},
		props.meta,
	);

	// Env loading is optional because some runtimes, such as Workers, already
	// own request-time env loading and can pass it in directly.
	const rawEnv =
		props.env ??
		(await props.loadEnv?.(adapter)) ??
		(adapter.getEnvVars ? await adapter.getEnvVars({ logger }) : undefined);

	const envSchema = props.envSchema;

	// Reading the config in Node doesn't need every value, such as secrets only the deployed runtime has, so values the
	// schema rejects stay raw there. The runtime validates the env before using it.
	const shouldValidateEnvSchema = props.validateEnvSchema ?? true;
	const env = shouldValidateEnvSchema
		? parseEnv(rawEnv, envSchema)
		: parseAvailableEnv(rawEnv, envSchema);

	await adapter.resolveOptions?.(env ?? {});

	const rawConfig = wrappedDefinition.config(env || {});
	await props.onRawConfig?.(rawConfig);

	const db = await resolveDatabaseAdapter(wrappedDefinition.db, env);

	// processConfig remains the shared source of truth for plugin init, merging
	// and validation once the adapter/env/bootstrap layer has been resolved.
	const config = await processConfig(rawConfig, {
		...(props.processConfigOptions ?? {}),
		configure: props.meta?.host
			? (draft) => {
					// A host renders the website on the CMS's own domain unless the project says otherwise.
					draft.urls.site ??= "/";
					wrappedDefinition.configure?.(draft);
				}
			: wrappedDefinition.configure,
		resolvedDb: db,
	});

	return {
		config,
		adapter,
		runtimeContext,
		envSchema,
		env,
		rawEnv,
		definition: wrappedDefinition,
	};
};

export default resolveConfigDefinition;
