import type {
	EnvironmentVariables,
	RuntimeAdapter,
} from "@lucidcms/core/types";
import type { GetPlatformProxyOptions, PlatformProxy } from "wrangler";

export type CloudflareWorkerImport = {
	path: string;
	default?: string;
	exports?: Array<
		| string
		| {
				name: string;
				as?: string;
		  }
	>;
};

export type CloudflareWorkerExport = {
	name: string;
	content: string;
	async?: boolean;
	params?: string[];
};

export type CloudflareWorkerExportArtifact = {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
};

export type AdapterOptions = {
	platformProxy?: GetPlatformProxyOptions;
	server?: {
		port?: number;
		hostname?: string;
	};
	wrangler?: {
		/**
		 * Generate a Wrangler deployment config into the build output directory.
		 *
		 * Defaults to true.
		 */
		generate?: boolean;
		/**
		 * Cloudflare bindings Lucid should generate in the Wrangler config.
		 */
		bindings?: CloudflareBindingsOptions;
		/**
		 * Optional source Wrangler config to merge into the generated config.
		 * Relative paths resolve from the Lucid config directory.
		 */
		configPath?: string;
		/**
		 * The generated Worker name. Defaults to the source Wrangler config name,
		 * package name, or project directory name.
		 */
		name?: string;
		/**
		 * Defaults to today's date if the source Wrangler config does not provide one.
		 */
		compatibilityDate?: string;
		/**
		 * Additional compatibility flags to merge into the generated config.
		 * nodejs_compat is always included.
		 */
		compatibilityFlags?: string[];
		/**
		 * Cron triggers to merge into the generated config.
		 */
		crons?: string[];
	};
};

export type CloudflareKVNamespaceBindingOptions = {
	binding?: string;
	id?: string;
	previewId?: string;
};

export type CloudflareR2BucketBindingOptions = {
	binding?: string;
	bucketName?: string;
	previewBucketName?: string;
};

export type CloudflareQueueBindingOptions = {
	binding?: string;
	queueName?: string;
	consumer?: {
		maxBatchSize?: number;
		maxRetries?: number;
		maxConcurrency?: number;
	};
};

export type CloudflareD1DatabaseBindingOptions = {
	binding?: string;
	databaseName?: string;
	databaseId?: string;
	previewDatabaseId?: string;
	remote?: boolean;
};

export type CloudflareBindingsOptions = {
	kv?: true | string | CloudflareKVNamespaceBindingOptions;
	r2?: true | string | CloudflareR2BucketBindingOptions;
	queues?: true | string | CloudflareQueueBindingOptions;
	d1?: true | string | CloudflareD1DatabaseBindingOptions;
};

export type CloudflareAdapterOptionsFactory = (
	env: EnvironmentVariables,
) => AdapterOptions | Promise<AdapterOptions>;

export type CloudflareAdapterOptionsValue =
	| AdapterOptions
	| CloudflareAdapterOptionsFactory;

export type PreparedWranglerConfig = {
	configPath: string;
	generatedConfigPath: string;
	projectRoot: string;
};

export type CloudflareRuntimeAdapter = RuntimeAdapter & {
	getOptions: () => AdapterOptions | undefined;
	resolveOptions: (env: EnvironmentVariables) => Promise<void>;
	getPlatformProxy: () => PlatformProxy | undefined;
	setPlatformProxy: (platformProxy: PlatformProxy | undefined) => void;
	getPreparedWranglerConfig: () => PreparedWranglerConfig | undefined;
	setPreparedWranglerConfig: (
		config: PreparedWranglerConfig | undefined,
	) => void;
};

export type CloudflareAdapterOptions = AdapterOptions;
export type AdapterOptionsType = CloudflareAdapterOptions;
