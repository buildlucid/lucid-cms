import type { AddressInfo } from "node:net";
import type z from "zod";
import type { Config, LucidConfig } from "../../types/config.js";
import type { LucidHonoContext } from "../../types.js";
import type { CLILogger } from "../cli/logger.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { DatabaseAdapterFactory } from "../db/adapter-factory.js";
import type { RenderedTemplates } from "../email/types.js";
import type { TranslationStore } from "../i18n/types.js";
import type RuntimeAdapterSchema from "./schema.js";

export type RuntimeBuildArtifactFile = {
	type: "file";
	path: string;
	content: string;
};

export type RuntimeBuildArtifactCompile = {
	type: "compile";
	path: string;
	content: string;
};

// biome-ignore lint/suspicious/noExplicitAny: explanation
export type RuntimeBuildArtifactCustom<T = any> = {
	type: string;
	custom: T;
};

export type RuntimeArtifactCustom<T = unknown> = {
	type: string;
	custom: T;
};

export type RuntimeBuildArtifact =
	| RuntimeBuildArtifactFile
	| RuntimeBuildArtifactCompile
	| RuntimeBuildArtifactCustom;

export type RuntimeArtifactProvider =
	| Array<RuntimeArtifactCustom>
	| ((
			env: EnvironmentVariables,
	  ) => Array<RuntimeArtifactCustom> | Promise<Array<RuntimeArtifactCustom>>);

export type RuntimePrepareArtifacts = {
	/**
	 * Custom artifacts that are specific to the runtime adapter.
	 */
	custom: Array<RuntimeArtifactCustom>;
};

export type ServeHandler = (props: {
	config: Config;
	translationStore: TranslationStore;
	logger: {
		instance: CLILogger;
		silent: boolean;
	};
	onListening: (props: {
		address: AddressInfo | string | null;
	}) => Promise<void>;
}) => Promise<{
	destroy: () => Promise<void>;
	onComplete?: () => Promise<void> | void;
	runtimeContext: AdapterRuntimeContext;
}>;

export type RuntimeBuildArtifacts = {
	/**
	 * Artifacts that plugins have marked as to be compiled. The key being the output, and the value being the input path.
	 */
	compile: Record<string, string>;
	/**
	 * Custom artifacts that are specific to the runtime adapter.
	 */
	custom: Array<RuntimeBuildArtifactCustom>;
};

export type BuildHandler = (props: {
	config: Config;
	translationStore: TranslationStore;
	definition: LucidConfigDefinition;
	configPath: string;
	outputPath: string;
	outputRelativeConfigPath: string;
	buildArtifacts: RuntimeBuildArtifacts;
	logger: {
		instance: CLILogger;
		silent: boolean;
	};
}) => Promise<{
	onComplete?: () => Promise<void> | void;
	/** This should match the runtime context that the runtime adpater would set for the built output when running your Lucid CMS instance */
	runtimeContext: AdapterRuntimeContext;
}>;

export type PrepareHandler = (props: {
	configPath: string;
	projectRoot: string;
	prepareArtifacts: RuntimePrepareArtifacts;
	logger: {
		instance: CLILogger;
		silent: boolean;
	};
}) => Promise<void>;

export type AdapterKeys = {
	queue: string;
	kv: string;
	media: string | null;
	email: string;
	database: string;
};

export type RuntimeSupport = {
	unsupported?: {
		databaseAdapter?: Array<{ key: string; message?: string }>;
		queueAdapter?: Array<{ key: string; message?: string }>;
		kvAdapter?: Array<{ key: string; message?: string }>;
		mediaAdapter?: Array<{ key: string; message?: string }>;
		emailAdapter?: Array<{ key: string; message?: string }>;
	};
	notices?: {
		databaseAdapter?: Array<{ key: string; message: string }>;
		queueAdapter?: Array<{ key: string; message: string }>;
		kvAdapter?: Array<{ key: string; message: string }>;
		mediaAdapter?: Array<{ key: string; message: string }>;
		emailAdapter?: Array<{ key: string; message: string }>;
	};
};

export type AdapterRuntimeContext = {
	/** The runtime key of the adapter */
	runtime: string;
	/** True when running from built/compiled bundle, false when running from source in development */
	compiled: boolean;
	/** The function to get the connection information from the Hono context */
	getConnectionInfo: (c: LucidHonoContext) => NetAddrInfo;
	/** The support information for the runtime adapter */
	support?: RuntimeSupport;
	/** If the adapter bundles the config and server entry point separately, the path to the config file relative to the output directory */
	configEntryPoint: string | null;
};

export interface EnvironmentVariables extends Record<string, unknown> {}

/** Identifies which execution context owns an adapter lifecycle invocation. */
export type AdapterLifecyclePurpose = "runtime" | "tooling" | "queue-consumer";

export type AdapterLifecycleContext = {
	config: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	/** Defaults to `runtime` when the caller does not specify a purpose. */
	purpose?: AdapterLifecyclePurpose;
};

export type GetEnvVarsLogger = {
	instance: CLILogger;
	silent: boolean;
};

export type RuntimeAdapterEnvLoader = (props: {
	logger: GetEnvVarsLogger;
}) => EnvironmentVariables | Promise<EnvironmentVariables>;

export type RuntimeAdapterOptionsResolver = (
	env: EnvironmentVariables,
) => void | Promise<void>;

export type RuntimeAdapterCLI = {
	prepare?: PrepareHandler;
	serve: ServeHandler;
	build: BuildHandler;
};

export type AdapterDefineConfig = (env: EnvironmentVariables) => LucidConfig;
export type LucidConfigRecipe = (draft: Config) => void;

export type LucidConfigDefinitionMeta = {
	emailTemplates?: RenderedTemplates;
};

export type RuntimeAdapterValue =
	| RuntimeAdapter
	| Promise<RuntimeAdapter>
	| (() => RuntimeAdapter | Promise<RuntimeAdapter>);

export type DatabaseAdapterValue =
	| DatabaseAdapter
	| Promise<DatabaseAdapter>
	| DatabaseAdapterFactory
	| Promise<DatabaseAdapterFactory>;

export type LucidConfigDefinition = {
	runtime: RuntimeAdapterValue;
	db: DatabaseAdapterValue;
	config: AdapterDefineConfig;
};

export type WrappedLucidConfigDefinition = LucidConfigDefinition & {
	recipe?: LucidConfigRecipe;
};

export type RuntimeConfigureLucid = (
	definition: WrappedLucidConfigDefinition,
	meta?: LucidConfigDefinitionMeta,
) => WrappedLucidConfigDefinition;

export type RuntimeAdapter = z.infer<typeof RuntimeAdapterSchema> & {
	getEnvVars?: RuntimeAdapterEnvLoader;
	resolveOptions?: RuntimeAdapterOptionsResolver;
	cli?: RuntimeAdapterCLI;
	configureLucid?: RuntimeConfigureLucid;
};

export type RuntimeConfigureLucidModule = {
	configureLucid: RuntimeConfigureLucid;
	default?: RuntimeConfigureLucid;
};

// ------------------------------------------------------------
// Hono

// - https://hono.dev/docs/helpers/conninfo#type-definitions

type AddressType = "IPv6" | "IPv4" | undefined;

type NetAddrInfo = {
	/**
	 * Transport protocol type
	 */
	transport?: "tcp" | "udp";
	/**
	 * Transport port number
	 */
	port?: number;

	address?: string;
	addressType?: AddressType;
} & (
	| {
			/**
			 * Host name such as IP Addr
			 */
			address: string;

			/**
			 * Host name type
			 */
			addressType: AddressType;
	  }
	// biome-ignore lint/complexity/noBannedTypes: explanation
	| {}
);
