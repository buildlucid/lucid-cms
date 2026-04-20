import type { LucidRetryConfig } from "./types/transport.js";

export const CLIENT_BASE_PATH = "/lucid/api/v1/client";
export const DEFAULT_DOCUMENT_STATUS = "latest";

export const ACCEPT_HEADER = "accept";
export const AUTHORIZATION_HEADER = "authorization";
export const CONTENT_TYPE_HEADER = "content-type";
export const JSON_CONTENT_TYPE = "application/json";
export const LOCALE_HEADER = "lucid-content-locale";

export const MILLISECONDS_PER_SECOND = 1000;

export const DEFAULT_RETRY_CONFIG: LucidRetryConfig = {
	attempts: 2,
	baseDelayMs: 150,
	maxDelayMs: 1000,
	methods: ["GET", "HEAD"],
	statusCodes: [408, 429, 502, 503, 504],
};
