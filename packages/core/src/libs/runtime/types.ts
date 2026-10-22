import type { AddressInfo } from "node:net";
import type { Plugin as RolldownPlugin } from "rolldown";
import type z from "zod";
import type { LucidHonoContext } from "../../exports/types.js";
import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import type { CLILogger } from "../cli/logger.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { DatabaseAdapterFactory } from "../db/adapter-factory.js";
import type { RenderedTemplates } from "../email/types.js";
import type { TranslationBundles, TranslationStore } from "../i18n/types.js";
import type RuntimeAdapterSchema from "./schema.js";

export type RuntimeBuildArtifactFile = {
	type: "file";
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
	/** Plugin build data for static mode. In development, `createCliDev` returns it. */
	pluginData: Record<string, unknown>;
	/** Plugin build module exports keyed by plugin for static mode, empty in development. */
	pluginModules: Record<string, unknown>;
	projectRoot: string;
	configPath: string;
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
	 * Custom artifacts that are specific to the runtime adapter.
	 */
	custom: Array<RuntimeBuildArtifactCustom>;
};

/** A Rollup-compatible plugin for the server bundle. */
export type BundlerPlugin = RolldownPlugin;

/** Options for Lucid to bundle runtime server entries with its own bundler and defaults. */
export type RuntimeBundleOptions = {
	/** Target platform, defaulting to `node`. */
	platform?: "node" | "browser" | "neutral";
	/** Package export conditions replacing the platform's defaults, such as `workerd`. */
	conditions?: string[];
	/** Package imports use `bundle` by default or load from `node_modules` at runtime with `external`. */
	packages?: "bundle" | "external";
	/** Build data such as translations and plugin build modules defaults to `bundle`, inlining and removing originals, while `external` loads it from build output at runtime. */
	buildData?: "bundle" | "external";
	/** Controls shared chunks, defaulting to `true`; `false` bundles each entry separately for platforms that run a single module. */
	splitting?: boolean;
	/** Module specifiers to replace, such as a browser build of a Node-only package. */
	alias?: Record<string, string>;
	/** Plugins for transforms these options don't cover. */
	plugins?: BundlerPlugin[];
};

/** Server entries that Lucid bundles into the build output. */
export type RuntimeBuild = {
	/** Entry module sources keyed by extensionless output paths such as `server`, importing the built `LucidBuild` project from `lucid:build`. */
	entries: Record<string, string>;
	bundle?: RuntimeBundleOptions;
	/** This should match the runtime context that the runtime adapter sets for the built output. */
	runtimeContext: AdapterRuntimeContext;
	/** Runs once the build has finished. */
	onComplete?: () => Promise<void> | void;
};

/** The built project, which runtime entries import from `lucid:build`. */
export type LucidBuild = {
	/** Spread into `createLucidHost` alongside the runtime's own options. */
	host: {
		definition: LucidConfigDefinition;
		envSchema?: z.ZodType;
		translationBundles: TranslationBundles;
		meta: Pick<LucidConfigDefinitionMeta, "emailTemplates">;
	};
	/** Plugin CLI build data, keyed by plugin key. */
	pluginData: Record<string, unknown>;
	/** Plugin build module exports, keyed by plugin key. */
	pluginModules: Record<string, unknown>;
};

/** Describes server entries for Lucid to bundle and writes supporting runtime files, such as platform configuration. */
export type BuildHandler = (props: {
	config: ResolvedLucidConfig;
	configPath: string;
	outputPath: string;
	buildArtifacts: RuntimeBuildArtifacts;
	logger: {
		instance: CLILogger;
		silent: boolean;
	};
}) => Promise<RuntimeBuild>;

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
	/** The server handling requests, `lucid` for Lucid's server or a framework key such as `astro`. */
	host: string;
	/** True when running from built/compiled bundle, false when running from source in development */
	compiled: boolean;
	/** The function to get the connection information from the Hono context */
	getConnectionInfo: (c: LucidHonoContext) => NetAddrInfo;
	/** The support information for the runtime adapter */
	support?: RuntimeSupport;
	/** Path to an emitted `lucid:build` module relative to the build output, or null, for loading the project in another thread. */
	buildModule: string | null;
	/** Plugin CLI data keyed by plugin, from `dev` during development or builds otherwise, omitted for plugin commands. */
	pluginData?: Record<string, unknown>;
	/** Plugin CLI build module exports keyed by plugin, empty during development. */
	pluginModules?: Record<string, unknown>;
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
