import type { ErrorResponse } from "@types";
import { clearCsrfSession, csrfReq } from "@/services/api/auth/useCsrf";
import useRefreshToken from "@/services/api/auth/useRefreshToken";
import { handleSiteErrors, LucidError } from "@/utils/error-handling";
import queryBuilder, { type QueryBuilderProps } from "@/utils/query-builder";

export interface RequestParams<Data> {
	url: string;
	query?: QueryBuilderProps;
	csrf?: boolean;
	config?: RequestConfig<Data>;
}

interface RequestConfig<Data> {
	method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
	body?: Data | FormData;
	headers?: Record<string, string>;
}

export const getFetchURL = (url: string, query?: QueryBuilderProps): string => {
	let targetUrl = import.meta.env.PROD
		? url
		: `${import.meta.env.VITE_API_DEV_URL}${url}`;
	if (query) {
		const queryString = queryBuilder(query);
		if (queryString) targetUrl += `?${queryString}`;
	}
	return targetUrl;
};

const prepareRequestBody = <Data>(
	body?: Data | FormData,
): string | FormData | undefined => {
	if (!body) return undefined;
	return body instanceof FormData ? body : JSON.stringify(body);
};

const prepareHeaders = async (
	csrf?: boolean,
	headers: Record<string, string> = {},
	body?: string | FormData | undefined,
): Promise<Record<string, string>> => {
	const updatedHeaders = { ...headers };
	if (csrf) {
		const csrfToken = await csrfReq();
		if (csrfToken) updatedHeaders["X-CSRF-Token"] = csrfToken;
	}
	if (headers["Content-Type"] === undefined && typeof body === "string") {
		updatedHeaders["Content-Type"] = "application/json";
	}
	return updatedHeaders;
};

const handleResponse = async <ResponseBody, Data = unknown>(
	params: RequestParams<Data>,
	fetchRes: Response,
): Promise<ResponseBody> => {
	if (fetchRes.status === 204 || fetchRes.status === 201) {
		return {} as ResponseBody;
	}

	const data = await fetchRes.json();

	if (fetchRes.status === 401) {
		if ((data as ErrorResponse).code === "authorisation") {
			return useRefreshToken(params);
		}
	}

	if (fetchRes.status === 403) {
		if ((data as ErrorResponse).code === "csrf") {
			clearCsrfSession();
			return await request(params);
		}
	}

	if (fetchRes.status === 429) {
		handleSiteErrors(data as ErrorResponse);
		throw new LucidError(
			(data as ErrorResponse).message,
			data as ErrorResponse,
		);
	}

	if (!fetchRes.ok) {
		handleSiteErrors(data as ErrorResponse);
		throw new LucidError(
			(data as ErrorResponse).message,
			data as ErrorResponse,
		);
	}

	return data as ResponseBody;
};

const request = async <ResponseBody, Data = unknown>(
	params: RequestParams<Data>,
): Promise<ResponseBody> => {
	const fetchURL = getFetchURL(params.url, params.query);
	const body = prepareRequestBody(params.config?.body);
	const headers = await prepareHeaders(
		params.csrf,
		params.config?.headers,
		body,
	);

	const fetchRes = await fetch(fetchURL, {
		method: params.config?.method,
		credentials: "include",
		body: body,
		headers: headers,
	});

	return handleResponse(params, fetchRes);
};

export default request;
