import type { LucidClientResponse } from "../types/errors.js";
import type {
	CreateClientOptions,
	LucidMiddleware,
	LucidRequestDescriptor,
	LucidTransport,
} from "../types/transport.js";
import {
	collectAbortSignals,
	forwardAbortSignals,
} from "../utils/transport/abort.js";
import {
	applyErrorMiddleware,
	createClientErrorResponse,
	createConfigurationErrorResponse,
	createFetchError,
	createHttpError,
	createParseError,
} from "../utils/transport/errors.js";
import { buildRequestHeaders } from "../utils/transport/headers.js";
import { parseJsonResponse } from "../utils/transport/response.js";
import {
	buildRetryDelay,
	mergeRetryConfig,
	parseRetryAfter,
	sleep,
} from "../utils/transport/retry.js";
import { resolveClientBaseUrl, serializeQuery } from "../utils/url.js";

/**
 * Creates the internal fetch transport that applies headers, middleware, retries, abort wiring, and result shaping.
 */
export const createTransport = (
	options: CreateClientOptions,
	middleware: LucidMiddleware[],
): LucidTransport => {
	return {
		request: async <TData>(
			descriptor: LucidRequestDescriptor,
		): Promise<LucidClientResponse<TData>> => {
			if (!options.baseUrl) {
				return createConfigurationErrorResponse(
					"`baseUrl` is required to create a Lucid client.",
				);
			}

			if (!options.apiKey) {
				return createConfigurationErrorResponse(
					"`apiKey` is required to create a Lucid client.",
				);
			}

			const fetchImpl = options.fetch ?? globalThis.fetch;
			if (typeof fetchImpl !== "function") {
				return createConfigurationErrorResponse(
					"No fetch implementation was found. Pass one explicitly with `createClient({ fetch })`.",
				);
			}

			const retryConfig = mergeRetryConfig(
				descriptor.request?.retry ?? options.retry,
			);
			const timeoutMs =
				descriptor.request?.timeoutMs ?? options.timeoutMs ?? undefined;
			const normalizedBaseUrl = resolveClientBaseUrl(options.baseUrl);
			const queryString = serializeQuery(descriptor.query);

			let attempt = 0;
			while (true) {
				attempt += 1;

				const headers = await buildRequestHeaders({
					baseHeaders: options.headers,
					requestHeaders: descriptor.request?.headers,
					apiKey: options.apiKey,
					hasBody: descriptor.body !== undefined,
				});

				let url = new URL(
					`${normalizedBaseUrl}${descriptor.path}${queryString}`,
				);
				let init: RequestInit = {
					method: descriptor.method,
					headers,
					body:
						descriptor.body === undefined
							? undefined
							: JSON.stringify(descriptor.body),
					signal: descriptor.request?.signal,
				};

				for (const current of middleware) {
					if (!current.onRequest) continue;

					const patched = await current.onRequest({
						operation: descriptor.operation,
						url,
						init,
						attempt,
					});
					if (patched?.url) {
						url =
							typeof patched.url === "string"
								? new URL(patched.url)
								: patched.url;
					}
					if (patched?.init) {
						init = {
							...init,
							...patched.init,
						};
					}
				}

				let timeoutId: ReturnType<typeof setTimeout> | undefined;
				let didTimeout = false;
				let cleanupAbortSignals = () => {};
				const requestSignals = collectAbortSignals(
					descriptor.request?.abortController?.signal,
					init.signal,
				);

				if (requestSignals.length === 1 && init.signal !== requestSignals[0]) {
					init = {
						...init,
						signal: requestSignals[0],
					};
				}

				if (requestSignals.length > 1 || timeoutMs !== undefined) {
					const controller = new AbortController();
					cleanupAbortSignals = forwardAbortSignals(controller, requestSignals);

					if (timeoutMs !== undefined) {
						timeoutId = setTimeout(() => {
							didTimeout = true;
							controller.abort();
						}, timeoutMs);
					}

					init = {
						...init,
						signal: controller.signal,
					};
				}

				let response: Response | undefined;
				try {
					response = await fetchImpl(url, init);
				} catch (error) {
					if (timeoutId) clearTimeout(timeoutId);
					cleanupAbortSignals();

					let fetchError = createFetchError(error, didTimeout);
					if (retryConfig) {
						fetchError.retryable =
							retryConfig.methods.includes(descriptor.method) &&
							attempt <= retryConfig.attempts;
					}

					fetchError = await applyErrorMiddleware(middleware, {
						operation: descriptor.operation,
						url,
						init,
						attempt,
						error: fetchError,
					});

					if (
						retryConfig &&
						fetchError.retryable &&
						attempt <= retryConfig.attempts
					) {
						await sleep(buildRetryDelay(attempt, null, retryConfig));
						continue;
					}

					return createClientErrorResponse(fetchError);
				}

				if (timeoutId) clearTimeout(timeoutId);
				cleanupAbortSignals();

				for (const current of middleware) {
					if (!current.onResponse) continue;
					const patched = await current.onResponse({
						operation: descriptor.operation,
						url,
						init,
						attempt,
						response,
					});
					if (patched) response = patched;
				}

				const parsedBody = await parseJsonResponse(response);
				if (!parsedBody.ok) {
					let parseError = createParseError(
						"Lucid returned a response that could not be parsed as JSON.",
						parsedBody.error,
					);

					parseError = await applyErrorMiddleware(middleware, {
						operation: descriptor.operation,
						url,
						init,
						attempt,
						error: parseError,
						response,
					});

					return createClientErrorResponse(parseError, response);
				}

				if (!response.ok) {
					let httpError = createHttpError(response, parsedBody.data);
					const shouldRetryHttpError =
						retryConfig !== false &&
						retryConfig.methods.includes(descriptor.method) &&
						retryConfig.statusCodes.includes(response.status);

					if (shouldRetryHttpError) {
						httpError.retryable = attempt <= retryConfig.attempts;
					}

					httpError = await applyErrorMiddleware(middleware, {
						operation: descriptor.operation,
						url,
						init,
						attempt,
						error: httpError,
						response,
					});

					if (
						retryConfig &&
						httpError.retryable &&
						attempt <= retryConfig.attempts
					) {
						const retryAfterMs = parseRetryAfter(
							response.headers.get("retry-after"),
						);
						await sleep(buildRetryDelay(attempt, retryAfterMs, retryConfig));
						continue;
					}

					return createClientErrorResponse(httpError, response);
				}

				return {
					data: parsedBody.data as TData,
					error: undefined,
					response,
				};
			}
		},
	};
};
