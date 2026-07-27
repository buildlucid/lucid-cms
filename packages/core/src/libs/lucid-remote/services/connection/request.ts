import type z from "zod";
import constants from "../../../../constants/constants.js";
import { oauthErrorSchema } from "../../schema/connection.js";
import type { RemoteResult } from "../../types.js";

/** Sends an OAuth JSON request and validates its success payload. */
export const requestConnectionJson = async <T>(
	url: string,
	init: RequestInit,
	schema: z.ZodType<T>,
	invalidResponseError = "invalid_server_response",
): Promise<RemoteResult<T>> => {
	try {
		const response = await fetch(url, {
			...init,
			cache: "no-store",
			redirect: "error",
			signal:
				init.signal ??
				AbortSignal.timeout(constants.connection.remoteRequestTimeoutMs),
			headers: {
				Accept: "application/json",
				...init.headers,
			},
		});
		const text = await response.text();
		let json: unknown = {};

		if (text) {
			if (
				response.headers
					.get("content-type")
					?.split(";", 1)[0]
					?.trim()
					.toLowerCase() !== "application/json"
			) {
				return {
					ok: false,
					status: response.status,
					error: invalidResponseError,
					transient: response.status >= 500,
				};
			}
			try {
				json = JSON.parse(text);
			} catch {
				return {
					ok: false,
					status: response.status,
					error: invalidResponseError,
					transient: response.status >= 500,
				};
			}
		}

		if (!response.ok) {
			const oauthError = oauthErrorSchema.safeParse(json);
			return {
				ok: false,
				status: response.status,
				error: oauthError.success
					? oauthError.data.error
					: `remote_http_${response.status}`,
				description: oauthError.success
					? oauthError.data.error_description
					: undefined,
				transient:
					response.status === 408 ||
					response.status === 429 ||
					response.status >= 500,
			};
		}

		const parsed = schema.safeParse(json);
		if (!parsed.success) {
			return {
				ok: false,
				status: response.status,
				error: invalidResponseError,
				transient: false,
			};
		}

		return {
			ok: true,
			status: response.status,
			data: parsed.data,
		};
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: "connection_unreachable",
			description: error instanceof Error ? error.message : undefined,
			transient: true,
		};
	}
};
