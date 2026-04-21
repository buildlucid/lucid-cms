import type { MediaAdapterServiceGetPresignedUrl } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY, STORAGE_UPLOAD_PATH } from "../constants.js";
import type { PluginOptions } from "../types.js";
import { createSignedMediaUrl } from "../utils/signed-media-url.js";

/**
 * Returns either a Lucid-owned signed upload route for binding mode or a real
 * S3-compatible presigned URL when the optional HTTP fallback is configured.
 */
export default (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceGetPresignedUrl => {
	return async (key, meta) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: undefined,
					data: {
						url: createSignedMediaUrl({
							host: meta.host,
							path: STORAGE_UPLOAD_PATH,
							key,
							secretKey: meta.secretKey,
							query: {
								extension: meta.extension,
							},
						}),
					},
				};
			}

			if (!client) {
				throw new Error("HTTP client is not configured.");
			}

			const headers = new Headers();

			if (meta.mimeType) headers.set("Content-Type", meta.mimeType);
			if (meta.extension) headers.set("x-amz-meta-extension", meta.extension);

			const response = await client.sign(
				new Request(
					`${pluginOptions.http.endpoint}/${pluginOptions.http.bucket}/${key}?X-Amz-Expires=${PRESIGNED_URL_EXPIRY}`,
					{
						method: "PUT",
					},
				),
				{
					headers,
					aws: { signQuery: true },
				},
			);

			return {
				error: undefined,
				data: {
					url: response.url.toString(),
					headers: Object.fromEntries(response.headers.entries()),
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? error.message
							: "Failed to generate an upload URL.",
				},
				data: undefined,
			};
		}
	};
};
