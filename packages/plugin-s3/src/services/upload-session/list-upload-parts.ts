import type { MediaAdapterServiceListUploadParts } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../../translations/index.js";
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
	return async (props) => {
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
						message: T("get_metadata_failed", {
							status: response.status,
							statusText: response.statusText,
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
							? error.message
							: T("an_unknown_error_occurred"),
				},
				data: undefined,
			};
		}
	};
};
