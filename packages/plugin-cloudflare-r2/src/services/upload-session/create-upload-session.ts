import { copy } from "@lucidcms/core/plugin";
import type { MediaAdapterServiceCreateUploadSession } from "@lucidcms/core/types";
import type { AwsClient } from "aws4fetch";
import { DEFAULT_PART_SIZE, PRESIGNED_URL_EXPIRY } from "../../constants.js";
import type { PluginOptions } from "../../types.js";
import {
	createBindingSingleSession,
	createSingleSession,
	extractXmlValue,
	objectUrl,
} from "./helpers.js";

/**
 * Creates an R2 upload session. Binding-only configurations gracefully use the
 * existing single-upload route, while HTTP fallback enables resumable multipart.
 */
export const createUploadSession = (
	client: AwsClient | null,
	pluginOptions: PluginOptions,
): MediaAdapterServiceCreateUploadSession => {
	return async (_context, props) => {
		try {
			if (!pluginOptions.http) {
				return {
					error: undefined,
					data: createBindingSingleSession(props.key, props),
				};
			}

			const http = pluginOptions.http;
			if (props.size === 0) {
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
				return {
					error: undefined,
					data: await createSingleSession(client, http, props.key, props),
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

			const headers = new Headers();
			if (props.mimeType) headers.set("Content-Type", props.mimeType);
			if (props.extension) headers.set("x-amz-meta-extension", props.extension);
			const signed = await client.sign(
				new Request(objectUrl(http, props.key, "?uploads"), {
					method: "POST",
					headers,
				}),
			);
			const response = await fetch(signed);
			if (!response.ok) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.upload.sessions.create.failed",
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

			const uploadId = extractXmlValue(await response.text(), "UploadId");
			if (!uploadId) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.r2.upload.sessions.upload.id.missing",
						),
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
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};
