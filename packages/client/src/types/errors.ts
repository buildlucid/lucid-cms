import type { ErrorResponse, ResponseBody } from "@lucidcms/types";

export type LucidClientErrorKind =
	| "http"
	| "network"
	| "timeout"
	| "abort"
	| "parse"
	| "configuration";

/** A failed request, including its category and whether it is eligible for retry. */
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

/** Successful result. The payload is data; refs, meta, links and the original Response are siblings. */
export type LucidClientSuccess<TData, TRefs = never> = ResponseBody<
	TData,
	TRefs
> & {
	error: undefined;
	response: Response;
};

/** Failed result. Data is undefined; response is present only when an HTTP response was received. */
export type LucidClientFailure = {
	data: undefined;
	refs?: undefined;
	links?: undefined;
	meta?: undefined;
	error: LucidClientError;
	response?: Response;
};

/** Check error before reading data. HTTP, network, parse, timeout and cancellation failures use the same result shape. */
export type LucidClientResponse<TData, TRefs = never> =
	| LucidClientSuccess<TData, TRefs>
	| LucidClientFailure;
