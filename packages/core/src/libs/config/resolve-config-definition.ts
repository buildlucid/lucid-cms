import type z from "zod";
import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import {
	createAdapter,
	createConfiguredDatabaseAdapter,
	getAdapterConfigureLucid,
	getAdapterModule,
	getDatabaseAdapterClass,
} from "../runtime-adapter/loaders.js";
import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdapter,
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
	"Lucid config must default export configureLucid({ adapter, database, config }).";

export type ResolveConfigDefinitionResult = {
	config: Config;
	adapter: RuntimeAdapter;
	envSchema?: z.ZodType;
	env: EnvironmentVariables | undefined;
	definition: LucidConfigDefinition;
};

const isConfigDefinition = (
	value: unknown,
): value is LucidConfigDefinition<string> => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const definition = value as {
		adapter?: { module?: unknown };
		database?: { module?: unknown };
		config?: unknown;
	};

	return (
		typeof definition.adapter?.module === "string" &&
		typeof definition.database?.module === "string" &&
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
		throw new LucidError({
			message: invalidConfigDefinitionMessage,
		});
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
	configureLucidPath?: string;
	logger?: GetEnvVarsLogger;
	processConfigOptions?: Parameters<typeof processConfig>[1];
}): Promise<ResolveConfigDefinitionResult> => {
	const definition = assertConfigDefinition(props.definition);
	const adapterModule = await getAdapterModule(definition.adapter.module);

	// Hosted integrations can supply their own configureLucid wrapper so the
	// runtime adapter identity stays separate from host-specific config shaping.
	const configureLucid =
		props.configureLucidPath &&
		props.configureLucidPath !== definition.adapter.module
			? await getAdapterConfigureLucid(props.configureLucidPath)
			: adapterModule.configureLucid;

	const wrappedDefinition = configureLucid(definition, props.meta);
	const adapter = await createAdapter(adapterModule, wrappedDefinition.adapter);
	const logger = props.logger ?? {
		instance: defaultLoggerInstance,
		silent: true,
	};
	// Env loading is optional because some hosts, like Astro Cloudflare, already
	// own the runtime bindings and can pass them in directly.
	const env =
		props.env ??
		(adapter.getEnvVars
			? await adapter.getEnvVars({
					logger,
				})
			: undefined);
	const envSchema = props.envSchema;

	if (envSchema && env) {
		envSchema.parse(env);
	}

	const DatabaseAdapterCtor = await getDatabaseAdapterClass(
		wrappedDefinition.database.module,
	);
	const db = createConfiguredDatabaseAdapter(
		DatabaseAdapterCtor,
		wrappedDefinition.database,
		env,
	);

	// processConfig remains the shared source of truth for plugin init, merging
	// and validation once the adapter/env/bootstrap layer has been resolved.
	const config = await processConfig(wrappedDefinition.config(env || {}), {
		...(props.processConfigOptions ?? {}),
		resolvedDb: db,
	});

	return {
		config,
		adapter,
		envSchema,
		env,
		definition: wrappedDefinition,
	};
};

export default resolveConfigDefinition;
