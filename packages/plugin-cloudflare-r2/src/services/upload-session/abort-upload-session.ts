import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceAbortUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
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
						message: copy(
							"server:plugin.cloudflare.r2.http.fallback.not.configured",
						),
					},
					data: undefined,
				};
			}
			const http = pluginOptions.http;
			if (!client) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.http.client.not.configured",
						),
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
						message: copy(
							"server:plugin.cloudflare.r2.upload.sessions.abort.failed",
							{
								data: {
									status: response.status,
									statusText: response.statusText,
								},
							},
						),
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
							? copy.literal(error.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};
