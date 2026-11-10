import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceAbortUploadSession } from "@lucidcms/core/types";
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
): MediaStorageAdapterServiceAbortUploadSession => {
	return async (_context, props) => {
		if (props.protocol !== "multipart-parts") {
			return;
		}

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
					{ method: "DELETE" },
				),
			);
			const response = await fetch(signed);
			if (!response.ok && response.status !== 404) {
				throw new LucidError({
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
				});
			}

			return;
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
