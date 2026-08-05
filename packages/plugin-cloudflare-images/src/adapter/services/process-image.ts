import { Buffer } from "node:buffer";
import { copy } from "@lucidcms/core/plugin";
import type { ImageProcessorServiceProcess } from "@lucidcms/core/types";
import {
	DEFAULT_IMAGES_BINDING,
	MAX_INPUT_BYTES,
	MAX_JPEG_PNG_DIMENSION,
	MAX_SOURCE_PIXELS,
} from "../../constants.js";
import type { CloudflareImagesPluginOptions } from "../../types.js";
import { buildResizeTransform } from "../../utils/build-resize-transform.js";
import {
	getCloudflareErrorDetails,
	getResponseErrorCode,
} from "../../utils/cloudflare-errors.js";
import {
	getExtensionFromFormat,
	getFormatFromMimeType,
	getMimeTypeFromFormat,
	isSupportedSourceMimeType,
	normalizeMimeType,
} from "../../utils/image-formats.js";
import { hasImageFormat, isRasterImageInfo } from "../../utils/image-info.js";
import {
	bufferToWebStream,
	readImageStream,
} from "../../utils/image-stream.js";
import { resolveImagesBinding } from "../../utils/resolve-binding.js";
import {
	isSupportedFormat,
	isSupportedRotation,
	isValidQuality,
} from "../../utils/validate-options.js";

/**
 * Processes one image using the configured Cloudflare Images binding.
 *
 * Source validation happens before the transform is created. Rotation is
 * applied before resizing, and source format is preserved unless the caller
 * explicitly requests a supported output format.
 */
const processImage = (
	pluginOptions: CloudflareImagesPluginOptions,
): ImageProcessorServiceProcess => {
	return async (context, { stream, options }) => {
		const bindingName = pluginOptions.binding ?? DEFAULT_IMAGES_BINDING;
		const binding = resolveImagesBinding(context, bindingName);

		if (!binding) {
			return {
				error: {
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.binding.missing",
						{
							data: { binding: bindingName },
						},
					),
				},
				data: undefined,
			};
		}

		if (options.rotate !== undefined && !isSupportedRotation(options.rotate)) {
			return {
				error: {
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.rotate.unsupported",
						{ data: { rotate: String(options.rotate) } },
					),
				},
				data: undefined,
			};
		}

		if (options.format !== undefined && !isSupportedFormat(options.format)) {
			return {
				error: {
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.output.format.unsupported",
						{ data: { format: String(options.format) } },
					),
				},
				data: undefined,
			};
		}

		if (options.quality !== undefined && !isValidQuality(options.quality)) {
			return {
				error: {
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.quality.invalid",
						{
							data: { quality: String(options.quality) },
						},
					),
				},
				data: undefined,
			};
		}

		try {
			const input = await readImageStream(stream);
			if (!input) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.input.too.large",
							{ data: { max: MAX_INPUT_BYTES } },
						),
					},
					data: undefined,
				};
			}

			const info = await binding.info(bufferToWebStream(input));
			if (!hasImageFormat(info)) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.response.invalid",
						),
					},
					data: undefined,
				};
			}

			const sourceMimeType = normalizeMimeType(info.format);
			if (!isSupportedSourceMimeType(sourceMimeType)) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.input.format.unsupported",
							{ data: { format: sourceMimeType || "unknown" } },
						),
					},
					data: undefined,
				};
			}

			if (!isRasterImageInfo(info)) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.response.invalid",
						),
					},
					data: undefined,
				};
			}

			if (info.width * info.height > MAX_SOURCE_PIXELS) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.input.area.too.large",
							{ data: { max: MAX_SOURCE_PIXELS } },
						),
					},
					data: undefined,
				};
			}

			if (
				(sourceMimeType === "image/jpeg" || sourceMimeType === "image/png") &&
				(info.width > MAX_JPEG_PNG_DIMENSION ||
					info.height > MAX_JPEG_PNG_DIMENSION)
			) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.input.dimension.too.large",
							{ data: { max: MAX_JPEG_PNG_DIMENSION } },
						),
					},
					data: undefined,
				};
			}

			let transformer = binding.input(bufferToWebStream(input));
			if (options.rotate) {
				transformer = transformer.transform({ rotate: options.rotate });
			}

			const resizeTransform = buildResizeTransform({
				options,
				sourceWidth: info.width,
				sourceHeight: info.height,
			});
			if (resizeTransform) {
				transformer = transformer.transform(resizeTransform);
			}

			const sourceFormat = getFormatFromMimeType(sourceMimeType);
			const outputFormat = options.format ?? sourceFormat;

			const output = await transformer.output({
				format: getMimeTypeFromFormat(outputFormat),
				...(options.quality !== undefined ? { quality: options.quality } : {}),
				anim: false,
			});

			if (
				!output ||
				typeof output.response !== "function" ||
				typeof output.contentType !== "function"
			) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.response.invalid",
						),
					},
					data: undefined,
				};
			}

			const response = output.response();
			if (!(response instanceof Response)) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.response.invalid",
						),
					},
					data: undefined,
				};
			}

			if (!response.ok) {
				throw Object.assign(new Error("Cloudflare Images request failed"), {
					code: getResponseErrorCode(response),
				});
			}

			const mimeType = normalizeMimeType(output.contentType());
			const actualFormat = getFormatFromMimeType(mimeType);
			if (!actualFormat) {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.response.invalid",
						),
					},
					data: undefined,
				};
			}

			const outputBuffer = Buffer.from(await response.arrayBuffer());

			return {
				error: undefined,
				data: {
					processed: true,
					buffer: outputBuffer,
					mimeType,
					size: outputBuffer.byteLength,
					extension: getExtensionFromFormat(actualFormat),
					shouldStore: true,
				},
			};
		} catch (error) {
			const details = getCloudflareErrorDetails(error);

			if (details.category === "validation") {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.cloudflare.validation",
							{ data: { code: details.code } },
						),
					},
					data: undefined,
				};
			}

			if (details.category === "configuration") {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.cloudflare.configuration",
							{ data: { code: details.code } },
						),
					},
					data: undefined,
				};
			}

			if (details.category === "transient") {
				return {
					error: {
						type: "plugin",
						message: copy(
							"server:plugin.cloudflare.images.errors.cloudflare.transient",
							{ data: { code: details.code } },
						),
					},
					data: undefined,
				};
			}

			return {
				error: {
					type: "plugin",
					message: copy("server:plugin.cloudflare.images.errors.unknown"),
				},
				data: undefined,
			};
		}
	};
};

export default processImage;
