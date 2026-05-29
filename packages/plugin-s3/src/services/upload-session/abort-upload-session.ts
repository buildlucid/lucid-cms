import { text } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceAbortUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../../types/types.js";
import { objectUrl } from "./helpers.js";

/**
 * Cancels an unfinished multipart upload so S3 can discard uploaded parts and
 * stop charging for incomplete session storage.
 */
export const abortUploadSession = (
	client: AwsClient,
	pluginOptions: PluginOptions,
): MediaAdapterServiceAbortUploadSession => {
	return async (props) => {
		try {
			const signed = await client.sign(
				new Request(
					objectUrl(
						pluginOptions,
						props.key,
						`?uploadId=${encodeURIComponent(props.uploadId)}`,
					),
					{ method: "DELETE" },
				),
			);
			const response = await fetch(signed);
			if (!response.ok && response.status !== 404) {
				return {
					error: {
						type: "plugin",
						message: text.server("plugin.s3.objects.delete.failed", {
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
				data: undefined,
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? text.literal(error.message)
							: text.server("plugin.s3.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};
