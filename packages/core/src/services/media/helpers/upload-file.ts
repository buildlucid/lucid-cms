import type { Readable } from "node:stream";
import z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import { toWebReadable } from "../../../libs/media-storage/normalize-body.js";
import { LucidAPIError } from "../../../utils/errors/index.js";

/** Bytes with a filename and optional MIME type, or a binary stream with its exact size. */
export type MediaUploadFile =
	| File
	| ({
			/** Original filename, including its extension. */
			fileName: string;
			/** MIME type hint. Lucid checks the stored file where the format can be detected. */
			mimeType?: string;
	  } & (
			| { body: Uint8Array }
			| { body: ReadableStream<Uint8Array> | Readable; size: number }
	  ));

const fileSchema = z.object({
	fileName: z.string().trim().min(1),
	mimeType: z.string().trim().optional(),
	size: z.number().int().nonnegative(),
});

/** Normalizes upload sources without reading the entire file into memory. */
export const normalizeUploadFile = (file: MediaUploadFile) => {
	if (file instanceof File) {
		return {
			...fileSchema.parse({
				fileName: file.name,
				mimeType: file.type,
				size: file.size,
			}),
			body: file.stream(),
		};
	}
	return {
		...fileSchema.parse({
			fileName: file.fileName,
			mimeType: file.mimeType,
			size:
				file.body instanceof Uint8Array
					? file.body.byteLength
					: "size" in file
						? file.size
						: undefined,
		}),
		body: file.body,
	};
};

/** Rejects truncated or oversized streams and propagates cancellation to the source. */
export const boundUploadBody = (
	file: ReturnType<typeof normalizeUploadFile>,
) => {
	if (file.body instanceof Uint8Array) return file.body;
	const source = toWebReadable(file.body);
	let bytes = 0;

	return source.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				if (!(chunk instanceof Uint8Array))
					throw new TypeError("Upload streams must contain bytes.");
				bytes += chunk.byteLength;
				if (bytes > file.size) {
					throw new LucidAPIError({
						status: 400,
						code: "invalid_request",
						message: copy("server:core.media.upload.size.mismatch"),
					});
				}
				controller.enqueue(chunk);
			},
			flush() {
				if (bytes !== file.size) {
					throw new LucidAPIError({
						status: 400,
						code: "invalid_request",
						message: copy("server:core.media.upload.size.mismatch"),
					});
				}
			},
		}),
	);
};
