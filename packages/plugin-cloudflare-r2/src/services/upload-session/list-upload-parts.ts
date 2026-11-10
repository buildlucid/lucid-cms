import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceListUploadParts } from "@lucidcms/core/types";
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
): MediaStorageAdapterServiceListUploadParts => {
	return async (_context, props) => {
		try {
			if (!pluginOptions.http) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.r2.http.fallback.not.configured",
					),
				});
			}
			const http = pluginOptions.http;
			if (!client) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.r2.http.client.not.configured",
					),
				});
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
				throw new LucidError({
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
				});
			}
			return { uploadedParts: parseParts(await response.text()) };
		} catch (error) {
			if (error instanceof LucidError) throw error;
			throw new LucidError({
				type: "plugin",
				message:
					error instanceof Error
						? copy.literal(error.message)
						: copy("server:plugin.cloudflare.r2.errors.unknown"),
			});
		}
	};
};
