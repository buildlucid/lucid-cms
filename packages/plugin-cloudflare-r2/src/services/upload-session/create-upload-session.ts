import type { MediaAdapterServiceCreateUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { DEFAULT_PART_SIZE, PRESIGNED_URL_EXPIRY } from "../../constants.js";
import T from "../../translations/index.js";
import type { PluginOptions } from "../../types.js";
import {
	createBindingSingleSession,
	createSingleSession,
	extractXmlValue,
	objectUrl,
} from "./helpers.js";

/**
 * Creates an R2 upload session. Binding-only configurations gracefully use the
 * existing single-upload route, while HTTP fallback enables resumable multipart.
 */
export const createUploadSession = (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceCreateUploadSession => {
	return async (key, meta) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: undefined,
					data: createBindingSingleSession(key, meta),
				};
			}

			const http = pluginOptions.http;
			if (meta.size === 0) {
				if (!client) {
					return {
						error: {
							type: "plugin",
							message: T("http_client_not_configured"),
						},
						data: undefined,
					};
				}
				return {
					error: undefined,
					data: await createSingleSession(client, http, key, meta),
				};
			}
			if (!client) {
				return {
					error: {
						type: "plugin",
						message: T("http_client_not_configured"),
					},
					data: undefined,
				};
			}

			const headers = new Headers();
			if (meta.mimeType) headers.set("Content-Type", meta.mimeType);
			if (meta.extension) headers.set("x-amz-meta-extension", meta.extension);
			const signed = await client.sign(
				new Request(objectUrl(http, key, "?uploads"), {
					method: "POST",
					headers,
				}),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: T("upload_session_failed", {
							status: response.status,
							statusText: response.statusText,
						}),
					},
					data: undefined,
				};
			}

			const uploadId = extractXmlValue(await response.text(), "UploadId");
			if (!uploadId) {
				return {
					error: {
						type: "plugin",
						message: T("upload_id_missing"),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					mode: "resumable",
					key,
					uploadId,
					partSize: DEFAULT_PART_SIZE,
					expiresAt: new Date(
						Date.now() + PRESIGNED_URL_EXPIRY * 1000,
					).toISOString(),
					uploadedParts: [],
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};
