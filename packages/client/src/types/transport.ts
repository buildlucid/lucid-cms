import type { LucidClientError, LucidClientResponse } from "./errors.js";

export type LucidHeaderFactory = () => HeadersInit | Promise<HeadersInit>;

export type LucidRetryConfig = {
	attempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
	methods: string[];
	statusCodes: number[];
};

export type LucidRetryInput = false | Partial<LucidRetryConfig>;

export type LucidRequestOptions = {
	headers?: HeadersInit;
	signal?: AbortSignal;
	abortController?: AbortController;
	timeoutMs?: number;
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

export type CreateClientOptions = {
	baseUrl: string;
	apiKey: string;
	fetch?: typeof globalThis.fetch;
	headers?: HeadersInit | LucidHeaderFactory;
	timeoutMs?: number;
	retry?: LucidRetryInput;
	middleware?: LucidMiddleware[];
};

export interface LucidTransport {
	request<TData>(
		descriptor: LucidRequestDescriptor,
	): Promise<LucidClientResponse<TData>>;
}
