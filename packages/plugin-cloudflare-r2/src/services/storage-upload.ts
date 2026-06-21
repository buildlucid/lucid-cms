import { copy, resolveMediaKeyTenant } from "@lucidcms/core/plugin";
import type { ServiceFn } from "@lucidcms/core/types";
import { DEFAULT_MAX_UPLOAD_SIZE, STORAGE_UPLOAD_PATH } from "../constants.js";
import type { PluginOptions } from "../types.js";
import { createFixedLengthStream } from "../utils/create-fixed-length-stream.js";
import { validateSignedMediaUrl } from "../utils/signed-media-url.js";
import { putObject } from "./upload-single.js";

const storageUpload =
	(
		pluginOptions: PluginOptions,
	): ServiceFn<
		[
			{
				key: string;
				token: string;
				timestamp: string;
				extension?: string;
				contentType?: string;
				contentLength?: number;
				body: ReadableStream<Uint8Array> | null;
			},
		],
		undefined
	> =>
	async (context, data) => {
		if (
			!validateSignedMediaUrl({
				path: STORAGE_UPLOAD_PATH,
				key: data.key,
				token: data.token,
				timestamp: data.timestamp,
				secretKey: context.config.secrets.cookie,
				query: {
					extension: data.extension,
				},
			})
		) {
			return {
				error: {
					type: "basic",
					status: 403,
					message: copy(
						"server:plugin.cloudflare.r2.signed.urls.invalid.or.expired",
					),
				},
				data: undefined,
			};
		}

		if (!data.body) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:plugin.cloudflare.r2.upload.body.missing"),
				},
				data: undefined,
			};
		}

		const maxUploadSize =
			context.config.media.limits.fileSize ?? DEFAULT_MAX_UPLOAD_SIZE;

		if (
			data.contentLength === undefined ||
			!Number.isFinite(data.contentLength) ||
			data.contentLength < 0
		) {
			return {
				error: {
					type: "basic" as const,
					status: 411,
					message: copy(
						"server:plugin.cloudflare.r2.upload.headers.content.length.missing",
					),
				},
				data: undefined,
			};
		}

		if (data.contentLength > maxUploadSize) {
			return {
				error: {
					type: "basic" as const,
					status: 413,
					message: copy("server:plugin.cloudflare.r2.upload.file.too.large", {
						data: {
							size: String(maxUploadSize),
						},
					}),
				},
				data: undefined,
			};
		}

		const fixedLengthBody = createFixedLengthStream(
			data.body,
			data.contentLength,
		);
		let uploadError: unknown;
		let streamError: unknown;
		const tenant = resolveMediaKeyTenant(context.config, data.key);

		try {
			await Promise.all([
				putObject(pluginOptions, context, {
					key: data.key,
					body: fixedLengthBody.stream,
					mimeType: data.contentType ?? "application/octet-stream",
					extension: data.extension ?? "",
					size: data.contentLength,
					type: "unknown",
					tenant,
				}),
				fixedLengthBody.completed.catch((error) => {
					streamError = error;
					throw error;
				}),
			]);
		} catch (error) {
			uploadError = error;
		}

		if (streamError) {
			return {
				error: {
					type: "plugin",
					message:
						streamError instanceof Error
							? copy.literal(streamError.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}

		if (uploadError) {
			return {
				error: {
					type: "plugin",
					message:
						uploadError instanceof Error
							? copy.literal(uploadError.message)
							: copy("server:plugin.cloudflare.r2.errors.unknown"),
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: undefined,
		};
	};

export default storageUpload;
