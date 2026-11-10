import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceGetUploadPartUrls } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY } from "../../constants.js";
import type { PluginOptions } from "../../types.js";
import { objectUrl } from "./helpers.js";

/**
 * Signs R2 S3-compatible part URLs for direct browser chunk uploads when the
 * HTTP fallback is configured.
 */
export const getUploadPartUrls = (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaStorageAdapterServiceGetUploadPartUrls => {
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
			const parts = await Promise.all(
				props.partNumbers.map(async (partNumber) => {
					const signed = await client.sign(
						new Request(
							objectUrl(
								http,
								props.key,
								`?partNumber=${partNumber}&uploadId=${encodeURIComponent(
									props.uploadId,
								)}&X-Amz-Expires=${PRESIGNED_URL_EXPIRY}`,
							),
							{ method: "PUT" },
						),
						{ aws: { signQuery: true } },
					);
					return {
						partNumber,
						url: signed.url.toString(),
						headers: Object.fromEntries(signed.headers.entries()),
					};
				}),
			);

			return { parts };
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
