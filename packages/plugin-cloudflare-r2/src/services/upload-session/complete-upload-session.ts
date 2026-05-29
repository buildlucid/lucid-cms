import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceCompleteUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../../types.js";
import { extractXmlValue, objectUrl } from "./helpers.js";

/**
 * Completes the R2 multipart upload once Lucid has the ordered part list, which
 * turns the temporary parts into the final object.
 */
export const completeUploadSession = (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceCompleteUploadSession => {
	return async (props) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.http.fallback.not.configured",
						),
					},
					data: undefined,
				};
			}
			const http = pluginOptions.http;
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
						http,
						props.key,
						`?uploadId=${encodeURIComponent(props.uploadId)}`,
					),
					{
						method: "POST",
						body,
						headers: { "Content-Type": "application/xml" },
					},
				),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.upload.sessions.complete.failed",
							{
								data: {
									status: response.status,
									statusText: response.statusText,
								},
							},
						),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					etag: extractXmlValue(await response.text(), "ETag")?.replace(
						/"/g,
						"",
					),
				},
			};
		} catch (error) {
			return {
				error: {
					type: "plugin",
					message:
						error instanceof Error
							? copy.literal(error.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};
