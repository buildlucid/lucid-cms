import { Buffer } from "node:buffer";
import type { Readable } from "node:stream";
import { MAX_INPUT_BYTES } from "../constants.js";

/** Creates a fresh web stream for each Images binding operation. */
export const bufferToWebStream = (buffer: Buffer): ReadableStream<Uint8Array> =>
	new Blob([new Uint8Array(buffer)]).stream();

/**
 * Buffers the source while enforcing Cloudflare's fixed binding input limit.
 * Returns undefined as soon as the stream exceeds the limit.
 */
export const readImageStream = async (
	stream: Readable,
): Promise<Buffer | undefined> => {
	const chunks: Buffer[] = [];
	let size = 0;

	for await (const chunk of stream) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += buffer.byteLength;

		if (size > MAX_INPUT_BYTES) {
			stream.destroy();
			return undefined;
		}

		chunks.push(buffer);
	}

	return Buffer.concat(chunks, size);
};
