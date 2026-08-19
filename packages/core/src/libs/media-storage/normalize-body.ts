import { Readable } from "node:stream";
import type { MediaStorageAdapterStreamBody } from "./types.js";

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
