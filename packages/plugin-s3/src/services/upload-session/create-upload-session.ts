import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceCreateUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { DEFAULT_PART_SIZE, PRESIGNED_URL_EXPIRY } from "../../constants.js";
import type { PluginOptions } from "../../types/types.js";
import { applyMetadataHeaders } from "../../utils/metadata-headers.js";
import {
	createSingleUploadSession,
	extractXmlValue,
	objectUrl,
} from "./helpers.js";

/**
 * Starts an S3 multipart upload and returns Lucid's resumable session metadata.
 * Zero-byte files stay on a single signed PUT because multipart has no parts.
 */
export const createUploadSession = (
	client: AwsClient,
	pluginOptions: PluginOptions,
): MediaAdapterServiceCreateUploadSession => {
	return async (_context, props) => {
		try {
			if (props.size === 0) {
				return {
					error: undefined,
					data: await createSingleUploadSession(
						client,
						pluginOptions,
						props.key,
						props,
					),
				};
			}

			const headers = new Headers();
			applyMetadataHeaders(headers, props);

			const signed = await client.sign(
				new Request(objectUrl(pluginOptions, props.key, "?uploads"), {
					method: "POST",
					headers,
				}),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.s3.objects.upload.failed", {
							data: {
								status: response.status,
								statusText: response.statusText,
							},
						}),
					},
					data: undefined,
				};
			}

			const uploadId = extractXmlValue(await response.text(), "UploadId");
			if (!uploadId) {
				return {
					error: {
						type: "plugin",
						message: copy("server:plugin.s3.upload.sessions.upload.id.missing"),
					},
					data: undefined,
				};
			}

			return {
				error: undefined,
				data: {
					mode: "resumable",
					key: props.key,
					uploadId,
					partSize: DEFAULT_PART_SIZE,
					expiresAt: new Date(
						Date.now() + PRESIGNED_URL_EXPIRY * 1000,
					).toISOString(),
					uploadedParts: [],
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
