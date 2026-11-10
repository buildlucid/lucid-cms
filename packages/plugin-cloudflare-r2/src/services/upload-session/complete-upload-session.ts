import { copy, LucidError } from "@lucidcms/core";
import type { MediaStorageAdapterServiceCompleteUploadSession } from "@lucidcms/core/types";
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
): MediaStorageAdapterServiceCompleteUploadSession => {
	return async (_context, props) => {
		try {
			if (props.protocol !== "multipart-parts") {
				return {};
			}

			if (!pluginOptions.http) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.r2.http.fallback.not.configured",
					),
				});
			}
			const http = pluginOptions.http;
			if (!client) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.r2.http.client.not.configured",
					),
				});
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
				throw new LucidError({
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
				});
			}

			return {
				etag: extractXmlValue(await response.text(), "ETag")?.replace(/"/g, ""),
			};
		} catch (error) {
			if (error instanceof LucidError) throw error;
			throw new LucidError({
				type: "plugin",
				message:
					error instanceof Error
						? copy.literal(error.message)
						: copy("server:plugin.cloudflare.r2.errors.unknown"),
			});
		}
	};
};
