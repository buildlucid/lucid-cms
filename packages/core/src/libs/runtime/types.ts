import type { AddressInfo } from "node:net";
import type z from "zod";
import type { LucidHonoContext } from "../../exports/types.js";
import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import type { CLILogger } from "../cli/logger.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { DatabaseAdapterFactory } from "../db/adapter-factory.js";
import type { RenderedTemplates } from "../email/types.js";
import type { TranslationStore } from "../i18n/types.js";
import type { PreparedResources } from "../resources/types.js";
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
	mode: "development" | "static";
	projectRoot: string;
	config: ResolvedLucidConfig;
	/** Parsed environment values and platform bindings from config loading. */
	env: EnvironmentVariables | undefined;
	translationStore: TranslationStore;
	logger: {
		instance: CLILogger;
		silent: boolean;
	};
	onListening: (props: {
		address: AddressInfo | string | null;
		adapterKeys: AdapterKeys;
	}) => Promise<void>;
}) => Promise<{
	destroy: () => Promise<void>;
	onComplete?: () => Promise<void> | void;
	runtimeContext: AdapterRuntimeContext;
	adapterKeys: AdapterKeys;
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
	/** Resolved resource inputs to include when compiling the project config. */
	resources: PreparedResources;
	config: ResolvedLucidConfig;
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
	mediaStorage: string | null;
	mediaDelivery: string;
	email: string;
	database: string;
};

export type RuntimeSupport = {
	unsupported?: {
		databaseAdapter?: Array<{ key: string; message?: string }>;
		queueAdapter?: Array<{ key: string; message?: string }>;
		kvAdapter?: Array<{ key: string; message?: string }>;
		mediaStorageAdapter?: Array<{ key: string; message?: string }>;
		mediaDeliveryAdapter?: Array<{ key: string; message?: string }>;
		emailAdapter?: Array<{ key: string; message?: string }>;
	};
	notices?: {
		databaseAdapter?: Array<{ key: string; message: string }>;
		queueAdapter?: Array<{ key: string; message: string }>;
		kvAdapter?: Array<{ key: string; message: string }>;
		mediaStorageAdapter?: Array<{ key: string; message: string }>;
		mediaDeliveryAdapter?: Array<{ key: string; message: string }>;
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

/** Controls whether a live database connection belongs to a runtime or invocation. */
export type DatabaseConnectionScope = "runtime" | "invocation";

/** Host setup and teardown context. Read request-specific bindings from ServiceContext during operations. */
export type AdapterLifecycleContext = {
	config: ResolvedLucidConfig;
	/**
	 * Host environment available during adapter setup. Request-isolated runtimes
	 * must resolve live I/O bindings from each service context instead of retaining
	 * them from this host-scoped lifecycle context.
	 */
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
};

export type GetEnvVarsLogger = {
	instance: CLILogger;
	silent: boolean;
};

export type RuntimeAdapterEnvLoader = (props: {
	logger: GetEnvVarsLogger;
}) => Record<string, unknown> | Promise<Record<string, unknown>>;

export type RuntimeAdapterOptionsResolver = (
	env: EnvironmentVariables,
) => void | Promise<void>;

export type RuntimeAdapterCLI = {
	/** Releases resources allocated while loading CLI configuration. Must be idempotent. */
	dispose?: () => Promise<void>;
	prepare?: PrepareHandler;
	serve: ServeHandler;
	build: BuildHandler;
};

/** Receives parsed environment values and returns project settings synchronously. */
export type LucidConfigFactory = (env: EnvironmentVariables) => LucidConfig;
/** Mutates the resolved config draft synchronously. Returning a replacement config is unsupported. */
export type ConfigTransform = (draft: ResolvedLucidConfig) => void;

export type LucidConfigDefinitionMeta = {
	/** Development hosts render the admin through Vite. */
	admin?: "development" | "static";
	emailTemplates?: RenderedTemplates;
	/** Identifies the framework or host resolving this definition. */
	host?: string;
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

/** Runtime, database and project configuration passed to defineConfig. */
export type LucidConfigDefinition = {
	/** Runtime adapter or factory for the deployment platform. */
	runtime: RuntimeAdapterValue;
	/** Database adapter or environment-aware factory. */
	db: DatabaseAdapterValue;
	/** Return project settings using the parsed environment. */
	config: LucidConfigFactory;
	/** Applies final project changes after plugin configuration. */
	configure?: ConfigTransform;
};

export type RuntimeAdaptConfig = (
	definition: LucidConfigDefinition,
	meta?: LucidConfigDefinitionMeta,
) => LucidConfigDefinition;

/** Module entrypoints exposed by a runtime for a supported host. */
export type RuntimeHostDefinition = {
	/** Request-time module used by the host to resolve and handle the runtime. */
	entrypoint: string;
	/** Optional build-time module for host-specific setup. */
	integrationEntrypoint?: string;
};

/** Deployment platform adapter with optional CLI and host integration support. */
export type RuntimeAdapter = Omit<
	z.infer<typeof RuntimeAdapterSchema>,
	"hosts"
> & {
	/** Host integrations supported by this runtime, keyed by host name. */
	hosts?: Record<string, RuntimeHostDefinition>;
	getEnvVars?: RuntimeAdapterEnvLoader;
	resolveOptions?: RuntimeAdapterOptionsResolver;
	cli?: RuntimeAdapterCLI;
	adaptConfig?: RuntimeAdaptConfig;
};

export type RuntimeAdaptConfigModule = {
	adaptConfig: RuntimeAdaptConfig;
	default?: RuntimeAdaptConfig;
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
