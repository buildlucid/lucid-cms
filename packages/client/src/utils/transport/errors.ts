import type {
	LucidClientError,
	LucidClientFailure,
} from "../../types/errors.js";
import type { LucidMiddleware } from "../../types/transport.js";

/**
 * Wraps internal errors in the shared no-throw response shape used across the client.
 */
export const createClientErrorResponse = (
	error: LucidClientError,
	response?: Response,
): LucidClientFailure => ({
	data: undefined,
	error,
	response,
});

/**
 * Builds a consistent failure when required transport configuration is missing.
 */
export const createConfigurationErrorResponse = (message: string) =>
	createClientErrorResponse({
		kind: "configuration",
		name: "Configuration Error",
		message,
		retryable: false,
	});

/**
 * Normalizes non-2xx responses while preserving Lucid error payload details when available.
 */
export const createHttpError = (
	response: Response,
	body?: unknown,
): LucidClientError => {
	if (body && typeof body === "object") {
		const payload = body as {
			name?: string;
			message?: string;
			status?: number;
			code?: string;
			errors?: LucidClientError["errors"];
		};

		return {
			kind: "http",
			name: payload.name ?? "Request Error",
			message:
				payload.message ?? `Request failed with status ${response.status}.`,
			status: payload.status ?? response.status,
			code: payload.code,
			errors: payload.errors,
			retryable: false,
		};
	}

	return {
		kind: "http",
		name: "Request Error",
		message: `Request failed with status ${response.status}.`,
		status: response.status,
		retryable: false,
	};
};

/**
 * Represents invalid JSON responses in the shared client error shape.
 */
export const createParseError = (
	message: string,
	cause: unknown,
): LucidClientError => ({
	kind: "parse",
	name: "Parse Error",
	message,
	retryable: false,
	cause,
});

/**
 * Separates abort failures from generic network failures so timeout and cancellation map cleanly.
 */
const isAbortError = (error: unknown): error is Error =>
	error instanceof Error && error.name === "AbortError";

/**
 * Maps fetch-level failures into client errors, including timeout and abort cases.
 */
export const createFetchError = (
	error: unknown,
	isTimeout: boolean,
): LucidClientError => {
	if (isAbortError(error)) {
		return {
			kind: isTimeout ? "timeout" : "abort",
			name: isTimeout ? "Timeout Error" : "Abort Error",
			message: isTimeout
				? "The request timed out before Lucid responded."
				: "The request was aborted before Lucid responded.",
			retryable: false,
			cause: error,
		};
	}

	if (error instanceof Error) {
		return {
			kind: "network",
			name: "Network Error",
			message:
				error.message || "A network error occurred while contacting Lucid.",
			retryable: true,
			cause: error,
		};
	}

	return {
		kind: "network",
		name: "Network Error",
		message: "A network error occurred while contacting Lucid.",
		retryable: true,
		cause: error,
	};
};

/**
 * Runs error middleware in sequence so internal hooks can enrich the final returned error.
 */
export const applyErrorMiddleware = async (
	middleware: LucidMiddleware[],
	context: {
		operation: string;
		url: URL;
		init: RequestInit;
		attempt: number;
		error: LucidClientError;
		response?: Response;
	},
) => {
	let nextError = context.error;

	for (const current of middleware) {
		if (!current.onError) continue;
		const patched = await current.onError({
			...context,
			error: nextError,
		});
		if (patched) nextError = patched;
	}

	return nextError;
};
