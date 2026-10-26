import type z from "zod";
import type { LucidHonoContext } from "../../exports/types.js";
import type { LucidConfig, ResolvedLucidConfig } from "../../types/config.js";
import type { CLILogger } from "../cli/logger.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { DatabaseAdapterFactory } from "../db/adapter-factory.js";
import type { RenderedTemplates } from "../email/types.js";
import type { TranslationBundles } from "../i18n/types.js";
import type { LoggerOverride } from "../logger/types.js";
import type { LucidAdapterOverrides } from "./create-lucid-adapters.js";
import type { LucidInvocation } from "./create-lucid-host.js";
import type RuntimeAdapterSchema from "./schema.js";

/** A runtime-specific artifact from a database adapter or plugin, such as a Cloudflare binding or Worker handler. */
export type RuntimeArtifactCustom<T = unknown> = {
	type: string;
	custom: T;
};

export type RuntimeArtifactProvider =
	| Array<RuntimeArtifactCustom>
	| ((
			env: EnvironmentVariables,
	  ) => Array<RuntimeArtifactCustom> | Promise<Array<RuntimeArtifactCustom>>);

/** The built project, which server entries import from `lucid:build`. */
export type LucidBuild = {
	/** Spread into `createLucidHost` alongside the runtime's own options. */
	host: {
		definition: LucidConfigDefinition;
		envSchema?: z.ZodType;
		translationBundles: TranslationBundles;
		meta: Pick<LucidConfigDefinitionMeta, "emailTemplates" | "admin" | "host">;
		/** During development, sends runtime logs to Lucid's Vite plugin to print. */
		logger?: LoggerOverride;
		/** In commands' task servers, an inline queue and no agent runner, so pending jobs and agent runs finish inside the command. */
		adapterOverrides?: LucidAdapterOverrides;
	};
	/** The exports of each plugin's Vite `module`, keyed by plugin. */
	pluginModules: Record<string, unknown>;
	/** Admin HTML for admin navigations no route handles, omitted when static assets serve it. */
	admin?: { html: string };
	/** Runtime tasks supplied by the Vite plugin during development and omitted from builds. */
	dev?: LucidDevBuild;
};

/** What the Vite plugin gives server entries during development to run tasks, such as migrations, inside the runtime. */
export type LucidDevBuild = {
	/** Authenticates the plugin's task requests. */
	token: string;
	/** Project migration files, imported through the server environment so they run where the database is. */
	migrations: LucidDevModule[];
	/** Project seed files, imported the same way for the seed commands. */
	seeds: LucidDevModule[];
};

/** A project file the server environment imports on demand. */
export type LucidDevModule = {
	path: string;
	load: () => Promise<{ default?: unknown }>;
};

/**
 * Lucid running inside a framework's server, which the runtime's hosted module creates from `lucid:build` and the
 * framework reaches through `lucid:hosted`.
 */
export type HostedLucid = {
	/** Serves a request for one of Lucid's paths, running development tasks first. */
	handle(request: Request): Promise<Response>;
	/** Creates an invocation the caller destroys, such as one per framework request for the toolkit. */
	createInvocation(): Promise<LucidInvocation>;
	/** Destroys the hosts this instance created. */
	destroy(): Promise<void>;
};

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
	/** The exports of each plugin's Vite `module`, keyed by plugin. */
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

/** Receives parsed environment values and returns project settings synchronously. */
export type LucidConfigFactory = (env: EnvironmentVariables) => LucidConfig;
/** Mutates the resolved config draft synchronously. Returning a replacement config is unsupported. */
export type ConfigTransform = (draft: ResolvedLucidConfig) => void;

export type LucidConfigDefinitionMeta = {
	/** Development hosts render the admin through Vite. */
	admin?: "development" | "static";
	emailTemplates?: RenderedTemplates;
	/** The key of the framework serving Lucid, when it isn't Lucid's own server. */
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

/** Deployment platform adapter with optional CLI support. */
export type RuntimeAdapter = z.infer<typeof RuntimeAdapterSchema> & {
	getEnvVars?: RuntimeAdapterEnvLoader;
	resolveOptions?: RuntimeAdapterOptionsResolver;
	adaptConfig?: RuntimeAdaptConfig;
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
