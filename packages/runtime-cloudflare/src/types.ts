import type {
	EnvironmentVariables,
	RuntimeAdapter,
	RuntimePrepareArtifacts,
} from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";

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

export type CloudflareWranglerConfigArtifact = {
	bindings?: CloudflareBindingsOptions;
};

export type AdapterOptions = {
	/**
	 * Wrangler environment used when Lucid loads local Cloudflare bindings and env.
	 */
	environment?: string;
	dev?: {
		port?: number;
		hostname?: string;
	};
	/**
	 * Path to a user-owned Wrangler config. Omit this to let Lucid generate
	 * `wrangler.lucid.jsonc` at the project root.
	 */
	wrangler?: string;
	/**
	 * Explicit Cloudflare bindings Lucid should generate in the Wrangler config.
	 * Cloudflare-aware plugins and adapters can also provide these automatically.
	 */
	bindings?: CloudflareBindingsOptions;
	worker?: {
		/**
		 * The generated Worker name. Defaults to the package name or project
		 * directory name.
		 */
		name?: string;
		/**
		 * Defaults to today's date.
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
	lucidConfigPath: string;
	wranglerConfigPath: string;
	generated: boolean;
	projectRoot: string;
	prepareArtifacts: RuntimePrepareArtifacts;
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
