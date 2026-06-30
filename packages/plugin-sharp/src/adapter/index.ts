import { copy } from "@lucidcms/core/plugin";
import type { ImageProcessorInstance } from "@lucidcms/core/types";
import mime from "mime-types";
import sharp from "sharp";

/**
 * The Sharp image processor
 */
const sharpImageProcessor = (): ImageProcessorInstance => ({
	type: "image-processor",
	key: "sharp",
	process: async (_context, { stream, options }) => {
		try {
			const transform = sharp().rotate();
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
						error instanceof Error && error.message
							? copy.literal(error.message)
							: copy("server:plugin.sharp.media.image.process.failed"),
				},
				data: undefined,
			};
		}
	},
});

export default sharpImageProcessor;
