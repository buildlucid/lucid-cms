import type {
	AgentRunStart,
	AgentRunWatch,
	EnvironmentVariables,
	LucidErrorData,
	LucidInvocation,
	RuntimeAdapter,
	RuntimeArtifactCustom,
} from "@lucidcms/core/types";

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

/** The RPC methods of the Durable Object that executes an agent run, which the Worker's agent runner calls. */
export type AgentRunObjectStub = {
	/** Opens the run's live stream, schedules execution through an alarm and returns its initial cursor. */
	start(input: AgentRunStart): Promise<string>;
	/** Streams the run's events as newline-delimited `AgentRunWatchLine` JSON. */
	watch(
		input: Pick<AgentRunWatch, "runId" | "cursor">,
	): Promise<ReadableStream<Uint8Array>>;
};

/** The Durable Object namespace bound as `LUCID_AGENT_RUNS`. */
export type AgentRunNamespace = {
	idFromName(name: string): unknown;
	get(id: unknown): AgentRunObjectStub;
};

/** One line of a watched run: an event with its stream cursor, or the error that ended the watch. */
export type AgentRunWatchLine =
	| { event: Parameters<AgentRunWatch["emit"]>[0]; id?: string }
	| { error: LucidErrorData };

/** The build artifact plugins add a Worker event handler with. */
export type CloudflareWorkerHandlerArtifact = RuntimeArtifactCustom<{
	/** The Worker event, such as `queue`. Lucid handles `fetch` and `scheduled`. */
	event: string;
	/** Module whose default export is a `CloudflareWorkerHandler`. */
	module: string;
}> & {
	type: "cloudflare:worker-handler";
};

/** The prepare artifact adapters and plugins declare the Cloudflare bindings they need with. */
export type CloudflareBindingsArtifact = RuntimeArtifactCustom<{
	bindings?: CloudflareBindingsOptions;
}> & {
	type: "cloudflare:bindings";
};

/** Worker, binding and local development settings accepted by cloudflare(). */
export type AdapterOptions = {
	/** Local development listener settings. */
	dev?: {
		/** Local development port. */
		port?: number;
		/** Local development hostname. */
		hostname?: string;
	};
	/**
	 * Explicit Cloudflare bindings Lucid should declare for the Worker.
	 * Cloudflare-aware plugins and adapters can also provide these automatically.
	 */
	bindings?: CloudflareBindingsOptions;
	/**
	 * Worker settings. `name` and `compatibilityDate` apply when the project has no `cloudflare.config.ts`, which sets its
	 * own otherwise.
	 */
	worker?: {
		/** The Worker's name. Defaults to the package name or project directory name. */
		name?: string;
		/** Defaults to Lucid's tested Cloudflare compatibility date. */
		compatibilityDate?: string;
		/** Compatibility flags the Worker needs besides `nodejs_compat`, which Lucid always adds. */
		compatibilityFlags?: string[];
	};
};

export type CloudflareKVNamespaceBindingOptions = {
	binding?: string;
	id?: string;
};

export type CloudflareR2BucketBindingOptions = {
	binding?: string;
	bucketName?: string;
};

export type CloudflareQueueBindingOptions = {
	/** Cloudflare Queue binding name. */
	binding?: string;
	/** Queue name. Defaults to a name derived from the worker and binding. */
	queueName?: string;
	/** Queue consumer options. */
	consumer?: {
		/** Maximum messages Cloudflare delivers in one batch. */
		maxBatchSize?: number;
		/** Maximum delivery retries managed by Cloudflare. */
		maxRetries?: number;
		/** Maximum concurrent Cloudflare consumer invocations. */
		maxConcurrency?: number;
	};
};

export type CloudflareImagesBindingOptions = {
	binding?: string;
};

export type CloudflareBindingsOptions = {
	kv?: true | string | CloudflareKVNamespaceBindingOptions;
	r2?: true | string | CloudflareR2BucketBindingOptions;
	queues?: true | string | CloudflareQueueBindingOptions;
	images?: true | string | CloudflareImagesBindingOptions;
};

export type CloudflareAdapterOptionsFactory = (
	env: EnvironmentVariables,
) => AdapterOptions | Promise<AdapterOptions>;

export type CloudflareAdapterOptionsValue =
	| AdapterOptions
	| CloudflareAdapterOptionsFactory;

export type CloudflareRuntimeAdapter = RuntimeAdapter & {
	getOptions: () => AdapterOptions | undefined;
	resolveOptions: (env: EnvironmentVariables) => Promise<void>;
};

export type CloudflareAdapterOptions = AdapterOptions;
export type AdapterOptionsType = CloudflareAdapterOptions;
