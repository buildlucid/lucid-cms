import { Buffer } from "node:buffer";
import { copy, LucidError } from "@lucidcms/core";
import type { MediaDeliveryServiceProcessImage } from "@lucidcms/core/types";
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
 * Validates and processes an image with Cloudflare Images. Rotates before resizing and preserves
 * the source format unless a supported output format is requested.
 */
const processImage = (
	pluginOptions: CloudflareImagesPluginOptions,
): MediaDeliveryServiceProcessImage => {
	return async (context, { stream, options }) => {
		const bindingName = pluginOptions.binding ?? DEFAULT_IMAGES_BINDING;
		const binding = resolveImagesBinding(context, bindingName);

		if (!binding) {
			throw new LucidError({
				type: "plugin",
				message: copy(
					"server:plugin.cloudflare.images.errors.binding.missing",
					{
						data: { binding: bindingName },
					},
				),
			});
		}

		if (options.rotate !== undefined && !isSupportedRotation(options.rotate)) {
			throw new LucidError({
				type: "plugin",
				message: copy(
					"server:plugin.cloudflare.images.errors.rotate.unsupported",
					{ data: { rotate: String(options.rotate) } },
				),
			});
		}

		if (options.format !== undefined && !isSupportedFormat(options.format)) {
			throw new LucidError({
				type: "plugin",
				message: copy(
					"server:plugin.cloudflare.images.errors.output.format.unsupported",
					{ data: { format: String(options.format) } },
				),
			});
		}

		if (options.quality !== undefined && !isValidQuality(options.quality)) {
			throw new LucidError({
				type: "plugin",
				message: copy(
					"server:plugin.cloudflare.images.errors.quality.invalid",
					{
						data: { quality: String(options.quality) },
					},
				),
			});
		}

		try {
			const input = await readImageStream(stream);
			if (!input) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.input.too.large",
						{ data: { max: MAX_INPUT_BYTES } },
					),
				});
			}

			const info = await binding.info(bufferToWebStream(input));
			if (!hasImageFormat(info)) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.response.invalid",
					),
				});
			}

			const sourceMimeType = normalizeMimeType(info.format);
			if (!isSupportedSourceMimeType(sourceMimeType)) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.input.format.unsupported",
						{ data: { format: sourceMimeType || "unknown" } },
					),
				});
			}

			if (!isRasterImageInfo(info)) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.response.invalid",
					),
				});
			}

			if (info.width * info.height > MAX_SOURCE_PIXELS) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.input.area.too.large",
						{ data: { max: MAX_SOURCE_PIXELS } },
					),
				});
			}

			if (
				(sourceMimeType === "image/jpeg" || sourceMimeType === "image/png") &&
				(info.width > MAX_JPEG_PNG_DIMENSION ||
					info.height > MAX_JPEG_PNG_DIMENSION)
			) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.input.dimension.too.large",
						{ data: { max: MAX_JPEG_PNG_DIMENSION } },
					),
				});
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
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.response.invalid",
					),
				});
			}

			const response = output.response();
			if (!(response instanceof Response)) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.response.invalid",
					),
				});
			}

			if (!response.ok) {
				throw Object.assign(new Error("Cloudflare Images request failed"), {
					code: getResponseErrorCode(response),
				});
			}

			const mimeType = normalizeMimeType(output.contentType());
			const actualFormat = getFormatFromMimeType(mimeType);
			if (!actualFormat) {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.response.invalid",
					),
				});
			}

			const outputBuffer = Buffer.from(await response.arrayBuffer());

			return {
				processed: true,
				buffer: outputBuffer,
				mimeType,
				size: outputBuffer.byteLength,
				extension: getExtensionFromFormat(actualFormat),
				shouldStore: true,
			};
		} catch (error) {
			if (error instanceof LucidError) throw error;
			const details = getCloudflareErrorDetails(error);

			if (details.category === "validation") {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.cloudflare.validation",
						{ data: { code: details.code } },
					),
				});
			}

			if (details.category === "configuration") {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.cloudflare.configuration",
						{ data: { code: details.code } },
					),
				});
			}

			if (details.category === "transient") {
				throw new LucidError({
					type: "plugin",
					message: copy(
						"server:plugin.cloudflare.images.errors.cloudflare.transient",
						{ data: { code: details.code } },
					),
				});
			}

			throw new LucidError({
				type: "plugin",
				message: copy("server:plugin.cloudflare.images.errors.unknown"),
			});
		}
	};
};

export default processImage;
