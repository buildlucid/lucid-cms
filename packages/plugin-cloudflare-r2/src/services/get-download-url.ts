import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceGetDownloadUrl } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY, STORAGE_DOWNLOAD_PATH } from "../constants.js";
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
	return async (_context, props) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: undefined,
					data: {
						url: createSignedMediaUrl({
							host: props.host,
							path: STORAGE_DOWNLOAD_PATH,
							key: props.key,
							secretKey: props.secretKey,
							query: {
								fileName: props.fileName ?? undefined,
								extension: props.extension ?? undefined,
							},
						}),
					},
				};
			}

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

			const objectUrl = new URL(
				`${pluginOptions.http.endpoint}/${pluginOptions.http.bucket}/${props.key}`,
			);
			objectUrl.searchParams.set("X-Amz-Expires", String(PRESIGNED_URL_EXPIRY));
			objectUrl.searchParams.set(
				"response-content-disposition",
				buildDownloadContentDisposition({
					key: props.key,
					fileName: props.fileName,
					extension: props.extension,
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
							? copy.literal(error.message)
							: copy(
									"server:plugin.cloudflare.r2.download.urls.generate.failed",
								),
				},
				data: undefined,
			};
		}
	};
};
