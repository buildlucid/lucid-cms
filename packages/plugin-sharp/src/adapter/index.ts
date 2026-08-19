import { copy } from "@lucidcms/core/plugin";
import type { MediaDeliveryAdapterInstance } from "@lucidcms/core/types";
import mime from "mime-types";
import sharp from "sharp";
import rotateFocalPoint from "./rotate-focal-point.js";

/** Sharp-backed media delivery with on-demand image transformation. */
const sharpMediaDeliveryAdapter = (): MediaDeliveryAdapterInstance => ({
	type: "media-delivery-adapter",
	key: "sharp",
	resolveFile: () => ({ type: "lucid" }),
	processImage: async (_context, { stream, options }) => {
		try {
			const chunks: Buffer[] = [];
			for await (const chunk of stream) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}
			const input = Buffer.concat(chunks);
			const metadata = await sharp(input).metadata();
			const orientation = metadata.orientation ?? 1;
			const orientationSwapsDimensions = orientation >= 5 && orientation <= 8;

			const orientedWidth = orientationSwapsDimensions
				? metadata.height
				: metadata.width;
			const orientedHeight = orientationSwapsDimensions
				? metadata.width
				: metadata.height;

			const rotationSwapsDimensions =
				options.rotate === 90 || options.rotate === 270;

			const sourceWidth = rotationSwapsDimensions
				? orientedHeight
				: orientedWidth;
			const sourceHeight = rotationSwapsDimensions
				? orientedWidth
				: orientedHeight;

			const focalPoint = options.focalPoint
				? rotateFocalPoint(options.focalPoint, options.rotate)
				: undefined;

			const transform = sharp(input).autoOrient();

			if (options.rotate) {
				transform.rotate(options.rotate);
			}

			if (options.format) {
				transform.toFormat(options.format, {
					quality: options.quality ? options.quality : 80,
				});
			}

			if (
				options.width &&
				options.height &&
				(options.fit ?? "cover") === "cover" &&
				focalPoint &&
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
						Math.round(focalPoint.x * sourceWidth - cropWidth / 2),
					),
				);

				const top = Math.max(
					0,
					Math.min(
						sourceHeight - cropHeight,
						Math.round(focalPoint.y * sourceHeight - cropHeight / 2),
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

export default sharpMediaDeliveryAdapter;
