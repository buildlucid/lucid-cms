import type { ErrorResponse } from "@lucidcms/types";

export type LucidClientErrorKind =
	| "http"
	| "network"
	| "timeout"
	| "abort"
	| "parse"
	| "configuration";

export interface LucidClientError {
	kind: LucidClientErrorKind;
	name: string;
	message: string;
	status?: number;
	code?: string;
	errors?: ErrorResponse["errors"];
	retryable: boolean;
	cause?: unknown;
}

export type LucidClientSuccess<T> = {
	data: T;
	error: undefined;
	response: Response;
};

export type LucidClientFailure = {
	data: undefined;
	error: LucidClientError;
	response?: Response;
};

export type LucidClientResponse<T> = LucidClientSuccess<T> | LucidClientFailure;
