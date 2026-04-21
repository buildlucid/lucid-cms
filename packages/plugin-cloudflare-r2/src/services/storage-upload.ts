import type { ServiceFn } from "@lucidcms/core/types";
import { DEFAULT_MAX_UPLOAD_SIZE, STORAGE_UPLOAD_PATH } from "../constants.js";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";
import { createFixedLengthStream } from "../utils/create-fixed-length-stream.js";
import { validateSignedMediaUrl } from "../utils/signed-media-url.js";
import { putObject } from "./upload-single.js";

const buildFileTooLargeError = (maxUploadSize: number) => ({
	error: {
		type: "basic" as const,
		status: 413,
		message: T("file_too_large_max_size_is", {
			size: String(maxUploadSize),
		}),
	},
	data: undefined,
});

const buildMissingContentLengthError = () => ({
	error: {
		type: "basic" as const,
		status: 411,
		message: T("missing_content_length_header"),
	},
	data: undefined,
});

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
					message: T("invalid_or_expired_signed_url"),
				},
				data: undefined,
			};
		}

		if (!data.body) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: T("missing_upload_body"),
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
			return buildMissingContentLengthError();
		}

		if (data.contentLength > maxUploadSize) {
			return buildFileTooLargeError(maxUploadSize);
		}

		const fixedLengthBody = createFixedLengthStream(
			data.body,
			data.contentLength,
		);
		let uploadError: unknown;
		let streamError: unknown;

		try {
			await Promise.all([
				putObject(pluginOptions, {
					key: data.key,
					data: fixedLengthBody.stream,
					meta: {
						mimeType: data.contentType ?? "application/octet-stream",
						extension: data.extension ?? "",
						size: data.contentLength,
						type: "unknown",
					},
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
							? streamError.message
							: T("an_unknown_error_occurred"),
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
							? uploadError.message
							: T("an_unknown_error_occurred"),
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
