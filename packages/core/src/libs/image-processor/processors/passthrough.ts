import mime from "mime-types";
import type { ImageProcessor } from "../../../types.js";

/**
 * A passthrough image processor that returns the original buffer without any processing.
 *
 * This is useful if you want to use the original image without any processing or the platform
 * you're using doesn't support other services or Sharp which is used by default.
 */
const passthroughProcessor: ImageProcessor = async (stream, options) => {
	try {
		const chunks: Buffer[] = [];

		for await (const chunk of stream) {
			chunks.push(chunk);
		}

		const buffer = Buffer.concat(chunks);

		const mimeType = options.format
			? mime.lookup(options.format) || "image/jpeg"
			: "image/jpeg";

		return {
			error: undefined,
			data: {
				buffer: buffer,
				mimeType: mimeType,
				size: buffer.length,
				extension: mime.extension(mimeType) || "jpg",
				shouldStore: false,
			},
		};
	} catch (error) {
		return {
			error: {
				type: "basic",
				message:
					error instanceof Error
						? error.message
						: "An error occurred while processing the image stream",
			},
			data: undefined,
		};
	}
};

export default passthroughProcessor;
