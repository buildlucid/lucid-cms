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
			const chunks: Buffer[] = [];
			for await (const chunk of stream) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}
			const input = Buffer.concat(chunks);
			const metadata = await sharp(input).metadata();
			const orientation = metadata.orientation ?? 1;
			const swapsDimensions = orientation >= 5 && orientation <= 8;
			const sourceWidth = swapsDimensions ? metadata.height : metadata.width;
			const sourceHeight = swapsDimensions ? metadata.width : metadata.height;
			const transform = sharp(input).rotate();

			if (options.format) {
				transform.toFormat(options.format, {
					quality: options.quality ? options.quality : 80,
				});
			}

			if (
				options.width &&
				options.height &&
				(options.fit ?? "cover") === "cover" &&
				options.focalPoint &&
				sourceWidth &&
				sourceHeight
			) {
				const targetRatio = options.width / options.height;
				const sourceRatio = sourceWidth / sourceHeight;

				const cropWidth =
					sourceRatio > targetRatio
						? Math.max(1, Math.round(sourceHeight * targetRatio))
						: sourceWidth;

				const cropHeight =
					sourceRatio > targetRatio
						? sourceHeight
						: Math.max(1, Math.round(sourceWidth / targetRatio));

				const left = Math.max(
					0,
					Math.min(
						sourceWidth - cropWidth,
						Math.round(options.focalPoint.x * sourceWidth - cropWidth / 2),
					),
				);

				const top = Math.max(
					0,
					Math.min(
						sourceHeight - cropHeight,
						Math.round(options.focalPoint.y * sourceHeight - cropHeight / 2),
					),
				);

				transform
					.extract({ left, top, width: cropWidth, height: cropHeight })
					.resize({
						width: options.width,
						height: options.height,
						fit: "fill",
					});
			} else if (options.width || options.height) {
				transform.resize({
					width: options.width,
					height: options.height,
					fit: options.fit ?? "cover",
				});
			}

			const outputBuffer = await transform.toBuffer();
			const mimeType = mime.lookup(options.format || "jpg") || "image/jpeg";

			return {
				error: undefined,
				data: {
					processed: true,
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
