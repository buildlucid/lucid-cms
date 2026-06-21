import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceListUploadParts } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../../types/types.js";
import { objectUrl, parseParts } from "./helpers.js";

/**
 * Reads S3's multipart state so the admin can resume from the parts the storage
 * provider has already accepted.
 */
export const listUploadParts = (
	client: AwsClient,
	pluginOptions: PluginOptions,
): MediaAdapterServiceListUploadParts => {
	return async (_context, props) => {
		try {
			const signed = await client.sign(
				new Request(
					objectUrl(
						pluginOptions,
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
						message: copy("server:plugin.s3.objects.metadata.fetch.failed", {
							data: {
								status: response.status,
								statusText: response.statusText,
							},
						}),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					uploadedParts: parseParts(await response.text()),
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? copy.literal(error.message)
							: copy("server:plugin.s3.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};
