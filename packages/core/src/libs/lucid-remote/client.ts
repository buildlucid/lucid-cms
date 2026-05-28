import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import type { LucidErrorData } from "../../types/errors.js";
import type { ErrorResponse } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { serverText } from "../i18n/index.js";
import type { LucidRemoteRequestData } from "./types.js";

type LucidRemoteRequestProps = {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	headers?: HeadersInit;
	body?: unknown;
	origin?: string;
	retries?: number;
};

type LucidRemoteClient = {
	request: <T>(
		path: string,
		props?: LucidRemoteRequestProps,
	) => ServiceResponse<LucidRemoteRequestData<T>>;
};

const clients = new Map<string, LucidRemoteClient>();

/**
 * Allows internal tests to point Lucid remote requests at a local service.
 * Production requests use the default remote domain.
 */
const getLucidRemoteApiDomain = (context: ServiceContext) => {
	const override = context.env?.LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE;

	return (
		typeof override === "string" && override.trim()
			? override.trim()
			: constants.endpoints.lucidRemoteApiDomain
	).replace(/\/+$/, "");
};

export const getLucidRemoteUrl = (context: ServiceContext, path: string) =>
	new URL(path, getLucidRemoteApiDomain(context)).toString();

const getErrorMessage = (error: unknown) =>
	error instanceof Error ? error.message : "Lucid remote request failed.";

const createRequestError = (error: unknown, status = 500) => ({
	error: {
		type: "basic" as const,
		status,
		message: serverText("core.lucid.remote.request.failed", {
			fallback: getErrorMessage(error),
		}),
	},
	data: undefined,
});

const isErrorResponse = (value: unknown): value is ErrorResponse => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const error = value as Partial<ErrorResponse>;

	return (
		typeof error.status === "number" &&
		typeof error.name === "string" &&
		typeof error.message === "string"
	);
};

const createRemoteError = (
	response: Response,
	json: unknown,
): { error: LucidErrorData; data: undefined } => {
	if (isErrorResponse(json)) {
		return {
			error: {
				type: "basic",
				status: json.status || response.status,
				name: serverText("core.lucid.remote.request.failed.name", {
					fallback: json.name,
				}),
				message: serverText("core.lucid.remote.request.failed", {
					fallback: json.message,
				}),
				errors: json.errors as LucidErrorData["errors"],
			},
			data: undefined,
		};
	}

	return {
		error: {
			type: "basic",
			status: response.status,
			message: serverText("core.lucid.remote.request.failed", {
				fallback: response.statusText || "Lucid remote request failed.",
			}),
		},
		data: undefined,
	};
};

const createLucidRemoteClient = (props: {
	apiDomain: string;
	origin: string;
}): LucidRemoteClient => ({
	request: async <T>(
		path: string,
		requestProps: LucidRemoteRequestProps = {},
	) => {
		const retries = requestProps.retries ?? 0;
		const url = new URL(path, props.apiDomain).toString();
		const headers = new Headers(requestProps.headers);

		if (!headers.has("Accept")) {
			headers.set("Accept", "application/json");
		}

		if (!headers.has("User-Agent")) {
			headers.set("User-Agent", `LucidCMS/${packageJson.version}`);
		}

		if (!headers.has("Origin")) {
			headers.set("Origin", requestProps.origin ?? props.origin);
		}

		const body =
			requestProps.body === undefined
				? undefined
				: typeof requestProps.body === "string"
					? requestProps.body
					: JSON.stringify(requestProps.body);

		if (body !== undefined && !headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const response = await fetch(url, {
					method: requestProps.method ?? "GET",
					headers,
					body,
				});

				if (response.status >= 500 && attempt < retries) {
					continue;
				}

				const responseBody = await response.text();
				let json: unknown;

				try {
					json = responseBody ? JSON.parse(responseBody) : {};
				} catch (error) {
					return createRequestError(error, response.status || 500);
				}

				if (!response.ok) {
					return createRemoteError(response, json);
				}

				return {
					error: undefined,
					data: {
						response,
						json: json as LucidRemoteRequestData<T>["json"],
					},
				};
			} catch (error) {
				if (attempt < retries) {
					continue;
				}

				return createRequestError(error);
			}
		}

		return createRequestError(new Error("Lucid remote request failed."));
	},
});

/**
 * Returns a cached client for Lucid-owned remote services.
 * Centralises remote domain config, CMS origin headers, JSON parsing, retries,
 * and conversion of remote Lucid errors into core service errors.
 */
export const getLucidRemoteClient = (context: ServiceContext) => {
	const apiDomain = getLucidRemoteApiDomain(context);
	const origin = getBaseUrl(context);
	const cacheKey = `${apiDomain}:${origin}`;
	const cachedClient = clients.get(cacheKey);

	if (cachedClient) {
		return cachedClient;
	}

	const client = createLucidRemoteClient({
		apiDomain,
		origin,
	});
	clients.set(cacheKey, client);

	return client;
};
