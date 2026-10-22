import type {
	EnvironmentVariables,
	LucidInvocation,
	RuntimeAdapter,
	RuntimePrepareArtifacts,
} from "@lucidcms/core/types";
import type { PlatformProxy } from "wrangler";

/** The Worker execution context passed to event handlers. */
export type CloudflareExecutionContext = {
	waitUntil(promise: Promise<unknown>): void;
	passThroughOnException?: () => void;
};

/** Handles a Worker event, such as `queue`, with a Lucid invocation that lasts for the event. */
export type CloudflareWorkerHandler<Event = unknown> = (props: {
	event: Event;
	env: EnvironmentVariables;
	ctx: CloudflareExecutionContext;
	invocation: LucidInvocation;
}) => Promise<void>;

/** A Worker event handler contributed by a plugin runtime hook. */
export type CloudflareWorkerHandlerArtifact = {
	/** The Worker event, such as `queue`. Lucid handles `fetch` and `scheduled`. */
	event: string;
	/** Module whose default export is a `CloudflareWorkerHandler`. */
	module: string;
};

export type CloudflareWranglerConfigArtifact = {
	bindings?: CloudflareBindingsOptions;
};

/** Worker, binding and local development settings accepted by cloudflare(). */
export type AdapterOptions = {
	/**
	 * Wrangler environment used when Lucid loads local Cloudflare bindings and env.
	 */
	environment?: string;
	/** Local development listener settings. */
	dev?: {
		/** Local development port. */
		port?: number;
		/** Local development hostname. */
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
	/** Settings for the generated Worker. */
	worker?: {
		/**
		 * The generated Worker name. Defaults to the package name or project
		 * directory name.
		 */
		name?: string;
		/** Defaults to Lucid's tested Cloudflare compatibility date. */
		compatibilityDate?: string;
		/**
		 * Additional compatibility flags to merge into the generated config.
		 * nodejs_compat is always included.
		 */
		compatibilityFlags?: string[];
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
	/** Cloudflare Queue binding name. */
	binding?: string;
	/** Wrangler Queue name. Defaults to a name derived from the worker and binding. */
	queueName?: string;
	/** Wrangler Queue consumer options. */
	consumer?: {
		/** Maximum messages Cloudflare delivers in one batch. */
		maxBatchSize?: number;
		/** Maximum delivery retries managed by Cloudflare. */
		maxRetries?: number;
		/** Maximum concurrent Cloudflare consumer invocations. */
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

export type CloudflareImagesBindingOptions = {
	binding?: string;
};

export type CloudflareBindingsOptions = {
	kv?: true | string | CloudflareKVNamespaceBindingOptions;
	r2?: true | string | CloudflareR2BucketBindingOptions;
	queues?: true | string | CloudflareQueueBindingOptions;
	d1?: true | string | CloudflareD1DatabaseBindingOptions;
	images?: true | string | CloudflareImagesBindingOptions;
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
