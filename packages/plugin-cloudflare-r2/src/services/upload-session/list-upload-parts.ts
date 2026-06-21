import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceListUploadParts } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
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
	return async (_context, props) => {
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
					{ method: "GET" },
				),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.upload.sessions.parts.list.failed",
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
							? copy.literal(error.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};
