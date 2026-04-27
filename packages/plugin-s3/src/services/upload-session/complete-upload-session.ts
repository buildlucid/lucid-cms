import type { MediaAdapterServiceCompleteUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import T from "../../translations/index.js";
import type { PluginOptions } from "../../types/types.js";
import { extractXmlValue, objectUrl } from "./helpers.js";

/**
 * Finalizes the multipart upload with S3 after Lucid has verified every part is
 * present, making the object available as one media file.
 */
export const completeUploadSession = (
	client: AwsClient,
	pluginOptions: PluginOptions,
): MediaAdapterServiceCompleteUploadSession => {
	return async (props) => {
		try {
			const body = `<CompleteMultipartUpload>${props.parts
				.sort((a, b) => a.partNumber - b.partNumber)
				.map(
					(part) =>
						`<Part><PartNumber>${part.partNumber}</PartNumber><ETag>"${part.etag.replace(/"/g, "")}"</ETag></Part>`,
				)
				.join("")}</CompleteMultipartUpload>`;
			const signed = await client.sign(
				new Request(
					objectUrl(
						pluginOptions,
						props.key,
						`?uploadId=${encodeURIComponent(props.uploadId)}`,
					),
					{
						method: "POST",
						body,
						headers: {
							"Content-Type": "application/xml",
						},
					},
				),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: T("upload_failed", {
							status: response.status,
							statusText: response.statusText,
						}),
					},
					data: undefined,
				};
			}

			const etag = extractXmlValue(await response.text(), "ETag")?.replace(
				/"/g,
				"",
			);
			return {
				error: undefined,
				data: { etag },
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
