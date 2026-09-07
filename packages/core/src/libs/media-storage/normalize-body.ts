import { Readable } from "node:stream";
import type { MediaStorageAdapterStreamBody } from "./types.js";

/** Converts stored bytes or a Node stream to a Web stream. Cancellation closes the source. */
export const toWebReadable = (
	body: MediaStorageAdapterStreamBody,
): ReadableStream<Uint8Array> => {
	if (body instanceof ReadableStream) return body;
	if (body instanceof Uint8Array) {
		return new ReadableStream({
			start(controller) {
				controller.enqueue(body);
				controller.close();
			},
		});
	}
	const iterator = body[Symbol.asyncIterator]();
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const result = await iterator.next();
			if (result.done) return controller.close();
			const chunk: unknown = result.value;
			if (!(chunk instanceof Uint8Array)) {
				await iterator.return?.();
				throw new TypeError("Media streams must contain bytes.");
			}
			controller.enqueue(chunk);
		},
		async cancel() {
			await iterator.return?.();
		},
	});
};

export const toNodeReadable = (
	body: MediaStorageAdapterStreamBody,
): Readable => {
	if (body instanceof Readable) {
		return body;
	}

	if (body instanceof Uint8Array) {
		return Readable.from(body);
	}

	return Readable.fromWeb(body as never);
};

export const splitBodyForProcessing = (body: MediaStorageAdapterStreamBody) => {
	if (body instanceof ReadableStream) {
		const [processingBody, fallbackBody] = body.tee();

		return {
			processingBody,
			fallbackBody,
		};
	}

	if (body instanceof Uint8Array) {
		return {
			processingBody: body,
			fallbackBody: body.slice(),
		};
	}

	return {
		processingBody: body,
		fallbackBody: body,
	};
};
