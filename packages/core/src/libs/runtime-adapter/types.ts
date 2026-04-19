import type { AddressInfo } from "node:net";
import type { WritableDraft } from "immer";
import type z from "zod";
import type { Config, LucidConfig } from "../../types/config.js";
import type { LucidHonoContext } from "../../types.js";
import type { CLILogger } from "../cli/logger.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { RenderedTemplates } from "../email-adapter/types.js";
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

export type RuntimeBuildArtifact =
	| RuntimeBuildArtifactFile
	| RuntimeBuildArtifactCompile
	| RuntimeBuildArtifactCustom;

export type ServeHandler = (props: {
	config: Config;
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

export type GetEnvVarsLogger = {
	instance: CLILogger;
	silent: boolean;
};

export type RuntimeAdapterEnvLoader = (props: {
	logger: GetEnvVarsLogger;
}) => EnvironmentVariables | Promise<EnvironmentVariables>;

export type RuntimeAdapterCLI = {
	serve: ServeHandler;
	build: BuildHandler;
};

export type AdapterDefineConfig = (env: EnvironmentVariables) => LucidConfig;
export type LucidConfigRecipe = (draft: WritableDraft<Config>) => void;

export interface AdapterOptionsByModule {
	[path: string]: Record<string, unknown> | undefined;
}

export interface DatabaseAdapterOptionsByModule {
	[path: string]: Record<string, unknown> | undefined;
}

export type ResolveAdapterOptions<AdapterModule extends string> =
	AdapterModule extends keyof AdapterOptionsByModule
		? AdapterOptionsByModule[AdapterModule]
		: Record<string, unknown> | undefined;

export type ResolveDatabaseAdapterOptions<DatabaseModule extends string> =
	DatabaseModule extends keyof DatabaseAdapterOptionsByModule
		? DatabaseAdapterOptionsByModule[DatabaseModule]
		: Record<string, unknown> | undefined;

export type LazyRuntimeAdapterReference<AdapterModule extends string = string> =
	{
		module: AdapterModule;
		options?: ResolveAdapterOptions<AdapterModule>;
	};

export type DatabaseAdapterOptionsResolver<DatabaseModule extends string> = (
	env: EnvironmentVariables,
) => ResolveDatabaseAdapterOptions<DatabaseModule> | undefined;

export type LazyDatabaseAdapterReference<
	DatabaseModule extends string = string,
> = {
	module: DatabaseModule;
	options?:
		| ResolveDatabaseAdapterOptions<DatabaseModule>
		| DatabaseAdapterOptionsResolver<DatabaseModule>;
};

export type LucidConfigDefinitionMeta = {
	emailTemplates?: RenderedTemplates;
};

export type LucidConfigDefinition<
	AdapterModule extends string = string,
	DatabaseModule extends string = string,
> = {
	adapter: LazyRuntimeAdapterReference<AdapterModule>;
	database: LazyDatabaseAdapterReference<DatabaseModule>;
	config: AdapterDefineConfig;
};

export type WrappedLucidConfigDefinition<
	AdapterModule extends string = string,
	DatabaseModule extends string = string,
> = LucidConfigDefinition<AdapterModule, DatabaseModule> & {
	recipe?: LucidConfigRecipe;
};

export type RuntimeConfigureLucid = <
	AdapterModule extends string,
	DatabaseModule extends string,
>(
	definition: WrappedLucidConfigDefinition<AdapterModule, DatabaseModule>,
	meta?: LucidConfigDefinitionMeta,
) => WrappedLucidConfigDefinition<AdapterModule, DatabaseModule>;

export type RuntimeAdapter = z.infer<typeof RuntimeAdapterSchema> & {
	getEnvVars?: RuntimeAdapterEnvLoader;
	cli?: RuntimeAdapterCLI;
};

export type RuntimeAdapterFactory = (
	options?: Record<string, unknown>,
) => RuntimeAdapter | Promise<RuntimeAdapter>;

export type DatabaseAdapterClass = new (
	options?: Record<string, unknown>,
) => DatabaseAdapter;

export type RuntimeAdapterModule = {
	configureLucid: RuntimeConfigureLucid;
	adapter?: RuntimeAdapterFactory;
	default?: RuntimeAdapterFactory;
};

export type DatabaseAdapterModule = {
	default?: DatabaseAdapterClass;
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
