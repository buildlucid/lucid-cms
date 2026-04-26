import type { Readable } from "node:stream";
import type { MediaAdapterServiceStream } from "../../../libs/media/types.js";

const MIME_SNIFF_BYTES = 8192;

const detectSvgMimeType = (buffer: Uint8Array) => {
	const snippet = new TextDecoder().decode(buffer);

	return /<svg[\s>]/i.test(snippet) ? "image/svg+xml" : null;
};

const readBodyChunk = async (body: {
	body: Readable | ReadableStream<Uint8Array> | Uint8Array;
}) => {
	if (body.body instanceof Uint8Array) {
		return body.body;
	}

	if (body.body instanceof ReadableStream) {
		const reader = body.body.getReader();
		const chunks: Uint8Array[] = [];

		while (true) {
			const result = await reader.read();
			if (result.done) break;
			chunks.push(result.value);
		}

		return Buffer.concat(chunks);
	}

	const chunks: Uint8Array[] = [];
	for await (const chunk of body.body) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}

	return Buffer.concat(chunks);
};

/**
 * Sniffs the uploaded object body instead of trusting storage metadata alone.
 * This is mainly used when validating replacement uploads so media type checks
 * can't be bypassed just by spoofing the uploaded content type.
 */
const detectStreamMimeType = async (
	streamMedia: MediaAdapterServiceStream,
	key: string,
) => {
	const streamRes = await streamMedia(key, {
		range: {
			start: 0,
			end: MIME_SNIFF_BYTES - 1,
		},
	});
	if (streamRes.error) return null;

	const chunk = await readBodyChunk(streamRes.data);
	if (chunk.length === 0) return null;

	const fileType = await import("file-type");
	const detected = await fileType.fileTypeFromBuffer(chunk);

	return detected?.mime ?? detectSvgMimeType(chunk);
};

export default detectStreamMimeType;
