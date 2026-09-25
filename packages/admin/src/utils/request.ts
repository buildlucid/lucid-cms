import type { ErrorResponse } from "@types";
import { clearCsrfSession, csrfReq } from "@/services/api/auth/useCsrf";
import { refreshTokenReq } from "@/services/api/auth/useRefreshToken";
import {
	getRequestInterfaceLocale,
	interfaceLocaleHeader,
} from "@/translations";
import { handleSiteErrors, LucidError } from "@/utils/error-handling";
import queryBuilder, { type QueryBuilderProps } from "@/utils/query-builder";

export interface RequestParams<Data = unknown> {
	url: string;
	method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
	/** Filters, sorts and pagination, added to the URL's query string. */
	query?: QueryBuilderProps;
	body?: Data | FormData;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	/** Sends a CSRF token. @default true for methods other than GET */
	csrf?: boolean;
	/** Shows a toast when the request fails. */
	displayErrorToast?: boolean;
}

export const getFetchURL = (url: string, query?: QueryBuilderProps): string => {
	const serialized = query ? queryBuilder(query) : "";
	if (!serialized) return url;

	const [pathname, hash] = url.split("#", 2);
	const [base, search] = pathname.split("?", 2);
	const params = new URLSearchParams(search);

	for (const [key, value] of new URLSearchParams(serialized)) {
		params.set(key, value);
	}

	return `${base}?${params}${hash ? `#${hash}` : ""}`;
};

const parseError = (data: unknown, response: Response): ErrorResponse => {
	const record = data && typeof data === "object" ? data : {};

	return {
		status: response.status,
		name:
			"name" in record && typeof record.name === "string"
				? record.name
				: "Request failed",
		message:
			"message" in record && typeof record.message === "string"
				? record.message
				: response.statusText || "Request failed",
		code:
			"code" in record && typeof record.code === "string"
				? record.code
				: undefined,
		// Validation details are checked when extracted by getFieldError.
		...("errors" in record && record.errors && typeof record.errors === "object"
			? { errors: record.errors as ErrorResponse["errors"] }
			: {}),
	};
};

/**
 * Sends a request with the admin session, locale and CSRF token, retrying once
 * after refreshing an expired session or token. Resolves with the successful
 * response and throws a `LucidError` otherwise.
 */
export const sendRequest = async <Data = unknown>(
	params: RequestParams<Data>,
): Promise<Response> => {
	const method = params.method ?? "GET";
	const csrf = params.csrf ?? method !== "GET";
	const body =
		params.body === undefined
			? undefined
			: params.body instanceof FormData
				? params.body
				: JSON.stringify(params.body);
	let refreshed = false;
	let refreshedCsrf = false;

	while (true) {
		params.signal?.throwIfAborted();
		const headers: Record<string, string> = { ...params.headers };

		const locale = getRequestInterfaceLocale();
		if (locale) headers[interfaceLocaleHeader] = locale;

		if (csrf) {
			const token = await csrfReq();
			if (token) headers["X-CSRF-Token"] = token;
		}

		if (
			typeof body === "string" &&
			!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
		) {
			headers["Content-Type"] = "application/json";
		}

		const response = await fetch(getFetchURL(params.url, params.query), {
			method,
			credentials: "include",
			body,
			headers,
			signal: params.signal,
		});
		if (response.ok) return response;

		const text = await response.text();
		let data: unknown;
		try {
			data = text ? JSON.parse(text) : undefined;
		} catch {}

		const error = parseError(data, response);
		if (
			response.status === 401 &&
			error.code === "authorisation" &&
			!refreshed
		) {
			refreshed = true;
			if (await refreshTokenReq()) continue;
		}

		if (
			response.status === 403 &&
			error.code === "csrf" &&
			csrf &&
			!refreshedCsrf
		) {
			refreshedCsrf = true;
			clearCsrfSession();
			continue;
		}

		if (params.displayErrorToast !== false) handleSiteErrors(error);
		throw new LucidError(error.message, error);
	}
};

/** Sends a typed request to the Lucid API. */
const request = async <ResponseBody = unknown, Data = unknown>(
	params: RequestParams<Data>,
): Promise<ResponseBody> => {
	const response = await sendRequest(params);
	const text = response.status === 204 ? "" : await response.text();
	try {
		return (text ? JSON.parse(text) : undefined) as ResponseBody;
	} catch {
		throw new Error("The API returned an invalid JSON response.");
	}
};

/**
 * Sends a request to the Lucid API. Pass `parse` to validate and type the
 * response. Throws a `LucidError` when the request fails.
 *
 * @example
 * ```ts
 * import { request } from "@lucidcms/admin/services";
 *
 * await request({
 * 	url: "/lucid/api/v1/redirects",
 * 	method: "POST",
 * 	body: { from: "/old", to: "/new" },
 * });
 * ```
 */
export function adminRequest<Result>(
	params: RequestParams & { parse: (value: unknown) => Result },
): Promise<Result>;
export function adminRequest(params: RequestParams): Promise<unknown>;
export async function adminRequest(
	params: RequestParams & { parse?: (value: unknown) => unknown },
): Promise<unknown> {
	const url = new URL(params.url, window.location.origin);
	if (url.origin !== window.location.origin) {
		throw new Error("Admin requests must use the current origin.");
	}

	const data = await request({
		...params,
		displayErrorToast: params.displayErrorToast ?? false,
	});
	return params.parse ? params.parse(data) : data;
}
export default request;
