import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import type { LucidErrorData } from "../../types/errors.js";
import type { ErrorResponse } from "../../types/response.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
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

type LucidRemoteErrorResponse = {
	status: number;
	code?: string;
	key?: string;
	name?: string;
	message: string;
	errors?: ErrorResponse["errors"];
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

const isErrorResponse = (value: unknown): value is LucidRemoteErrorResponse => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const error = value as Partial<LucidRemoteErrorResponse>;

	return (
		typeof error.status === "number" &&
		typeof error.message === "string" &&
		(error.code === undefined || typeof error.code === "string") &&
		(error.key === undefined || typeof error.key === "string") &&
		(error.name === undefined || typeof error.name === "string")
	);
};

const getErrorCopy = (errorKey?: string) => {
	switch (errorKey) {
		case "ai_invalid_license":
			return {
				name: copy("server:core.ai.remote.license.invalid.name"),
				message: copy("server:core.ai.remote.license.invalid.message"),
			};
		case "ai_license_key_required":
			return {
				name: copy("server:core.ai.remote.license.key.required.name"),
				message: copy("server:core.ai.remote.license.key.required.message"),
			};
		case "failed_to_load_cms_license":
		case "failed_to_load_cms_licenses":
			return {
				name: copy("server:core.ai.remote.license.verify.failed.name"),
				message: copy("server:core.ai.remote.license.verify.failed.message"),
			};
		case "license_not_found":
			return {
				name: copy("server:core.ai.remote.license.not.found.name"),
				message: copy("server:core.ai.remote.license.not.found.message"),
			};
		case "organisation_ai_credit_exhausted":
			return {
				name: copy("server:core.ai.remote.credit.exhausted.name"),
				message: copy("server:core.ai.remote.credit.exhausted.message"),
			};
		case "organisation_ai_deferred_debit_outstanding":
			return {
				name: copy("server:core.ai.remote.deferred.debit.outstanding.name"),
				message: copy(
					"server:core.ai.remote.deferred.debit.outstanding.message",
				),
			};
		case "organisation_ai_top_up_requires_payment_method":
			return {
				name: copy("server:core.ai.remote.top.up.payment.method.name"),
				message: copy("server:core.ai.remote.top.up.payment.method.message"),
			};
		case "organisation_ai_top_up_pending":
			return {
				name: copy("server:core.ai.remote.top.up.pending.name"),
				message: copy("server:core.ai.remote.top.up.pending.message"),
			};
		case "organisation_ai_top_up_failed":
			return {
				name: copy("server:core.ai.remote.top.up.failed.name"),
				message: copy("server:core.ai.remote.top.up.failed.message"),
			};
		case "license_ai_period_cap_reached":
			return {
				name: copy("server:core.ai.remote.period.cap.reached.name"),
				message: copy("server:core.ai.remote.period.cap.reached.message"),
			};
		case "license_ai_disabled_for_usage":
			return {
				name: copy("server:core.ai.remote.license.ai.disabled.name"),
				message: copy("server:core.ai.remote.license.ai.disabled.message"),
			};
		case "license_deactivated_for_usage":
			return {
				name: copy("server:core.ai.remote.license.deactivated.name"),
				message: copy("server:core.ai.remote.license.deactivated.message"),
			};
		case "license_not_found_for_usage":
			return {
				name: copy("server:core.ai.remote.license.not.found.name"),
				message: copy("server:core.ai.remote.license.not.found.message"),
			};
		case "cms_ai_feature_not_supported":
			return {
				name: copy("server:core.ai.remote.feature.not.supported.name"),
				message: copy("server:core.ai.remote.feature.not.supported.message"),
			};
		case "ai_provider_configuration_missing":
			return {
				name: copy("server:core.ai.remote.provider.configuration.name"),
				message: copy("server:core.ai.remote.provider.configuration.message"),
			};
		case "ai_usage_pricing_missing":
		case "ai_pricing_must_be_usd":
			return {
				name: copy("server:core.ai.remote.pricing.configuration.name"),
				message: copy("server:core.ai.remote.pricing.configuration.message"),
			};
		case "cms_ai_image_source_invalid":
			return {
				name: copy("server:core.ai.remote.image.source.invalid.name"),
				message: copy("server:core.ai.remote.image.source.invalid.message"),
			};
		case "cms_ai_image_storage_configuration_missing":
			return {
				name: copy("server:core.ai.remote.image.storage.unavailable.name"),
				message: copy(
					"server:core.ai.remote.image.storage.unavailable.message",
				),
			};
		case "cms_ai_generation_request_not_found":
		case "cms_ai_generated_image_not_found":
			return {
				name: copy("server:core.ai.remote.generation.not.found.name"),
				message: copy("server:core.ai.remote.generation.not.found.message"),
			};
		case "cms_ai_idempotency_key_required":
		case "cms_ai_idempotency_key_conflict":
			return {
				name: copy("server:core.ai.remote.generation.request.invalid.name"),
				message: copy(
					"server:core.ai.remote.generation.request.invalid.message",
				),
			};
		case "ai_provider_request_failed":
		case "ai_provider_invalid_response":
		case "ai_provider_output_truncated":
			return {
				name: copy("server:core.ai.remote.provider.failed.name"),
				message: copy("server:core.ai.remote.provider.failed.message"),
			};
		default:
			return undefined;
	}
};

const createRemoteError = (
	response: Response,
	json: unknown,
): { error: LucidErrorData; data: undefined } => {
	if (isErrorResponse(json)) {
		const errorKey = json.key ?? json.code;
		const errorCopy = getErrorCopy(errorKey);

		return {
			error: {
				type: "basic",
				status: json.status || response.status,
				key: errorKey,
				name:
					errorCopy?.name ??
					copy("server:core.lucid.remote.request.failed.name", {
						defaultMessage: json.name ?? "Lucid remote request failed",
					}),
				message:
					errorCopy?.message ??
					copy("server:core.lucid.remote.request.failed", {
						defaultMessage: json.message,
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
			message: copy("server:core.lucid.remote.request.failed", {
				defaultMessage: response.statusText || "Lucid remote request failed.",
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
					return {
						error: {
							type: "basic",
							status: response.status || 500,
							message: copy("server:core.lucid.remote.request.failed", {
								defaultMessage:
									error instanceof Error
										? error.message
										: "Lucid remote request failed.",
							}),
						},
						data: undefined,
					};
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

				return {
					error: {
						type: "basic",
						status: 500,
						message: copy("server:core.lucid.remote.request.failed", {
							defaultMessage:
								error instanceof Error
									? error.message
									: "Lucid remote request failed.",
						}),
					},
					data: undefined,
				};
			}
		}

		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:core.lucid.remote.request.failed", {
					defaultMessage: "Lucid remote request failed.",
				}),
			},
			data: undefined,
		};
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
