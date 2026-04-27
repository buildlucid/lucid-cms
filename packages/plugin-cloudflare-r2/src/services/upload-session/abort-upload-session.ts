import type { MediaAdapterServiceAbortUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../../translations/index.js";
import type { PluginOptions } from "../../types.js";
import { objectUrl } from "./helpers.js";

/**
 * Aborts an active R2 multipart upload, cleaning up provider-side parts when the
 * Lucid session is cancelled or expires.
 */
export const abortUploadSession = (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceAbortUploadSession => {
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
					{ method: "DELETE" },
				),
			);
			const response = await fetch(signed);
			if (!response.ok && response.status !== 404) {
				return {
					error: {
						type: "plugin",
						message: T("abort_upload_failed", {
							status: response.status,
							statusText: response.statusText,
						}),
					},
					data: undefined,
				};
			}

			return { error: undefined, data: undefined };
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
