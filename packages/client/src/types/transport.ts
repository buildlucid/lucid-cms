import type { LucidClientError, LucidClientResponse } from "./errors.js";

/** Resolves headers for each request, for example a current correlation ID. */
export type LucidHeaderFactory = () => HeadersInit | Promise<HeadersInit>;

/** Returns the current OAuth access token when a request is made. */
export type LucidAccessTokenFactory = () => string | Promise<string>;

/** Integration API key or OAuth bearer token used for content API requests. */
export type LucidClientAuth =
	| {
			type: "apiKey";
			apiKey: string;
	  }
	| {
			type: "oauth";
			accessToken: string | LucidAccessTokenFactory;
	  };

/** Retry policy for eligible request methods and response status codes. */
export type LucidRetryConfig = {
	/** Number of retries after the initial request. Defaults to 2. */
	attempts: number;
	/** Initial backoff delay in milliseconds. Defaults to 150. */
	baseDelayMs: number;
	/** Maximum backoff delay in milliseconds. Defaults to 1000. */
	maxDelayMs: number;
	/** HTTP methods eligible for retry. Defaults to GET and HEAD. */
	methods: string[];
	/** HTTP statuses eligible for retry. Defaults to 408, 429, 502, 503 and 504. */
	statusCodes: number[];
};

export type LucidRetryInput = false | Partial<LucidRetryConfig>;

/** Per-request overrides for client transport settings. */
export type LucidRequestOptions = {
	/** Additional headers for this request. */
	headers?: HeadersInit;
	/** Abort the request. Cancellation returns an error with kind abort. */
	signal?: AbortSignal;
	/** Timeout per attempt in milliseconds. Omission uses the client setting, with no timeout by default. */
	timeoutMs?: number;
	/** Override retry settings or set false to disable retries. */
	retry?: LucidRetryInput;
};

export type LucidRequestDescriptor = {
	operation: string;
	method: "GET" | "POST";
	path: string;
	query?: Record<string, unknown>;
	body?: unknown;
	request?: LucidRequestOptions;
};

export type LucidMiddlewareRequestContext = {
	operation: string;
	url: URL;
	init: RequestInit;
	attempt: number;
};

export type LucidMiddlewareResponseContext = LucidMiddlewareRequestContext & {
	response: Response;
};

export type LucidMiddlewareErrorContext = LucidMiddlewareRequestContext & {
	error: LucidClientError;
	response?: Response;
};

/** Callbacks for each HTTP attempt, response and client error. */
export type LucidMiddleware = {
	/** Runs before each request and may replace the URL or request init. */
	onRequest?: (context: LucidMiddlewareRequestContext) =>
		| undefined
		| {
				url?: URL | string;
				init?: RequestInit;
		  }
		| Promise<
				| undefined
				| {
						url?: URL | string;
						init?: RequestInit;
				  }
		  >;
	/** Runs after a response and may replace it before parsing. */
	onResponse?: (
		context: LucidMiddlewareResponseContext,
	) => undefined | Response | Promise<undefined | Response>;
	/** Runs after a client error and may replace the error. */
	onError?: (
		context: LucidMiddlewareErrorContext,
	) => undefined | LucidClientError | Promise<undefined | LucidClientError>;
};

/** Connection, authentication and transport settings for createClient. */
export type CreateClientOptions = {
	/** Lucid instance URL, such as https://cms.example.com. */
	baseUrl: string;
	/** Credential used for external API access. Keep integration keys in server code. */
	auth: LucidClientAuth;
	/** Fetch implementation to use. Defaults to globalThis.fetch. */
	fetch?: typeof globalThis.fetch;
	/** Headers applied to requests. A callback can supply fresh values. */
	headers?: HeadersInit | LucidHeaderFactory;
	/** Timeout per attempt in milliseconds. Omission uses the client setting, with no timeout by default. */
	timeoutMs?: number;
	/** Override retry settings or set false to disable retries. */
	retry?: LucidRetryInput;
	/** Transport callbacks, run in array order. */
	middleware?: LucidMiddleware[];
};

export interface LucidTransport {
	request<TData, TRefs = never>(
		descriptor: LucidRequestDescriptor,
	): Promise<LucidClientResponse<TData, TRefs>>;
}
