import type { MediaAdapterServiceGetUploadPartUrls } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { PRESIGNED_URL_EXPIRY } from "../../constants.js";
import T from "../../translations/index.js";
import type { PluginOptions } from "../../types/types.js";
import { objectUrl } from "./helpers.js";

/**
 * Signs browser-writable URLs for the missing multipart chunks requested by
 * Lucid, keeping AWS credentials on the server.
 */
export const getUploadPartUrls = (
	client: AwsClient,
	pluginOptions: PluginOptions,
): MediaAdapterServiceGetUploadPartUrls => {
	return async (props) => {
		try {
			const parts = await Promise.all(
				props.partNumbers.map(async (partNumber) => {
					const signed = await client.sign(
						new Request(
							objectUrl(
								pluginOptions,
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

			return {
				error: undefined,
				data: { parts },
			};
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
