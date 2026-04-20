import {
	DEFAULT_RETRY_CONFIG,
	MILLISECONDS_PER_SECOND,
} from "../../constants.js";
import type {
	CreateClientOptions,
	LucidRequestOptions,
	LucidRetryConfig,
} from "../../types/transport.js";

/**
 * Applies request or client retry overrides on top of the lightweight default policy.
 */
export const mergeRetryConfig = (
	override?: LucidRequestOptions["retry"] | CreateClientOptions["retry"],
): LucidRetryConfig | false => {
	if (override === false) return false;

	return {
		...DEFAULT_RETRY_CONFIG,
		...(override ?? {}),
		methods:
			override && "methods" in override && override.methods
				? [...override.methods]
				: [...DEFAULT_RETRY_CONFIG.methods],
		statusCodes:
			override && "statusCodes" in override && override.statusCodes
				? [...override.statusCodes]
				: [...DEFAULT_RETRY_CONFIG.statusCodes],
	};
};

/**
 * Parses Retry-After values in either seconds or HTTP-date form so retries can respect server guidance.
 */
export const parseRetryAfter = (value: string | null): number | null => {
	if (!value) return null;

	const asNumber = Number(value);
	if (!Number.isNaN(asNumber)) {
		return Math.max(asNumber * MILLISECONDS_PER_SECOND, 0);
	}

	const asDate = Date.parse(value);
	if (Number.isNaN(asDate)) return null;
	return Math.max(asDate - Date.now(), 0);
};

/**
 * Waits between retry attempts and keeps delay behavior reusable from one place.
 */
export const sleep = async (ms: number) =>
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

/**
 * Calculates the next retry delay, preferring Retry-After when Lucid supplies one.
 */
export const buildRetryDelay = (
	attempt: number,
	retryAfterMs: number | null,
	retryConfig: LucidRetryConfig,
) => {
	if (retryAfterMs !== null) {
		return Math.min(retryAfterMs, retryConfig.maxDelayMs);
	}

	const exponential = retryConfig.baseDelayMs * 2 ** Math.max(attempt - 1, 0);
	const jitter = Math.floor(Math.random() * retryConfig.baseDelayMs);
	return Math.min(exponential + jitter, retryConfig.maxDelayMs);
};
