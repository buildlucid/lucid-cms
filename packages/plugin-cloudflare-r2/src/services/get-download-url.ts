import type { MediaAdapterServiceGetDownloadUrl } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY, STORAGE_DOWNLOAD_PATH } from "../constants.js";
import type { PluginOptions } from "../types.js";
import { createSignedMediaUrl } from "../utils/signed-media-url.js";

/**
 * Mirrors upload URL generation: binding mode returns an internal Lucid route,
 * while HTTP fallback mode signs a direct S3-compatible download URL.
 */
export default (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceGetDownloadUrl => {
	return async (key, meta) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: undefined,
					data: {
						url: createSignedMediaUrl({
							host: meta.host,
							path: STORAGE_DOWNLOAD_PATH,
							key,
							secretKey: meta.secretKey,
						}),
					},
				};
			}

			if (!client) {
				throw new Error("HTTP client is not configured.");
			}

			const objectUrl = new URL(
				`${pluginOptions.http.endpoint}/${pluginOptions.http.bucket}/${key}`,
			);
			objectUrl.searchParams.set("X-Amz-Expires", String(PRESIGNED_URL_EXPIRY));

			const fileName = key.split("/").filter(Boolean).at(-1) ?? key;
			objectUrl.searchParams.set(
				"response-content-disposition",
				`attachment; filename="${fileName}"`,
			);

			const response = await client.sign(
				new Request(objectUrl.toString(), {
					method: "GET",
				}),
				{
					aws: { signQuery: true },
				},
			);

			return {
				error: undefined,
				data: {
					url: response.url.toString(),
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? error.message
							: "Failed to generate a download URL.",
				},
				data: undefined,
			};
		}
	};
};
