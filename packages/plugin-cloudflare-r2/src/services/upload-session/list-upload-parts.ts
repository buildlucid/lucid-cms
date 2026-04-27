import type { MediaAdapterServiceListUploadParts } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../../translations/index.js";
import type { PluginOptions } from "../../types.js";
import { objectUrl, parseParts } from "./helpers.js";

/**
 * Uses R2's S3-compatible list-parts response to reconcile resumable state after
 * refreshes, retries, or hidden ETag headers.
 */
export const listUploadParts = (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceListUploadParts => {
	return async (props) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: {
						type: "plugin",
						message: T("http_fallback_not_configured"),
					},
					data: undefined,
				};
			}
			const http = pluginOptions.http;
			if (!client) {
				return {
					error: {
						type: "plugin",
						message: T("http_client_not_configured"),
					},
					data: undefined,
				};
			}
			const signed = await client.sign(
				new Request(
					objectUrl(
						http,
						props.key,
						`?uploadId=${encodeURIComponent(props.uploadId)}`,
					),
					{ method: "GET" },
				),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: T("list_parts_failed", {
							status: response.status,
							statusText: response.statusText,
						}),
					},
					data: undefined,
				};
			}
			return {
				error: undefined,
				data: { uploadedParts: parseParts(await response.text()) },
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
