import type { MediaAdapterServiceGetDownloadUrl } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY, STORAGE_DOWNLOAD_PATH } from "../constants.js";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";
import buildDownloadContentDisposition from "../utils/build-download-content-disposition.js";
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
							query: {
								fileName: meta.fileName ?? undefined,
								extension: meta.extension ?? undefined,
							},
						}),
					},
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

			const objectUrl = new URL(
				`${pluginOptions.http.endpoint}/${pluginOptions.http.bucket}/${key}`,
			);
			objectUrl.searchParams.set("X-Amz-Expires", String(PRESIGNED_URL_EXPIRY));
			objectUrl.searchParams.set(
				"response-content-disposition",
				buildDownloadContentDisposition({
					key,
					fileName: meta.fileName,
					extension: meta.extension,
				}),
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
							: T("failed_to_generate_download_url"),
				},
				data: undefined,
			};
		}
	};
};
