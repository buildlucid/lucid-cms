import type { ErrorResponse, ResponseBody } from "@lucidcms/types";

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

export type LucidClientSuccess<TData, TRefs = never> = ResponseBody<
	TData,
	TRefs
> & {
	error: undefined;
	response: Response;
};

export type LucidClientFailure = {
	data: undefined;
	refs?: undefined;
	links?: undefined;
	meta?: undefined;
	error: LucidClientError;
	response?: Response;
};

export type LucidClientResponse<TData, TRefs = never> =
	| LucidClientSuccess<TData, TRefs>
	| LucidClientFailure;
