import mime from "mime-types";
import type { ImageProcessor } from "../../../types.js";

/**
 * A Sharp-based image processor that can resize, convert formats, and optimize images.
 *
 * This processor dynamically imports Sharp to avoid dependency issues.
 */
const sharpProcessor: ImageProcessor = async (stream, options) => {
	try {
		const sharp = await import("sharp");

		const transform = sharp.default().rotate();
		stream.pipe(transform);

		if (options.format) {
			transform.toFormat(options.format, {
				quality: options.quality ? options.quality : 80,
			});
		}

		if (options.width || options.height) {
			transform.resize({
				width: options.width ? options.width : undefined,
				height: options.height ? options.height : undefined,
			});
		}

		const outputBuffer = await transform.toBuffer();
		const mimeType = mime.lookup(options.format || "jpg") || "image/jpeg";

		return {
			error: undefined,
			data: {
				buffer: outputBuffer,
				mimeType: mimeType,
				size: outputBuffer.length,
				extension: mime.extension(mimeType) || "jpg",
				shouldStore: true,
			},
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				message:
					error instanceof Error
						? error.message
						: "An error occurred while processing the image with Sharp",
			},
			data: undefined,
		};
	}
};

export default sharpProcessor;
