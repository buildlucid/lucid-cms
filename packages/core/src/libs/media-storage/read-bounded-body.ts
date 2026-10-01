import { toWebReadable } from "./normalize-body.js";
import type { MediaStorageAdapterStreamBody } from "./types.js";

/**
 * Reads stored bytes into memory, cancelling the stream as soon as it exceeds
 * `maxBytes` or `signal` aborts. Callers map each outcome to their own error.
 */
const readBoundedBody = async (
	body: MediaStorageAdapterStreamBody,
	props: { maxBytes: number; signal: AbortSignal },
): Promise<
	| { type: "complete"; bytes: Buffer }
	| { type: "too-large" }
	| { type: "aborted" }
> => {
	const reader = toWebReadable(body).getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	const cancel = () => {
		void reader.cancel().catch(() => undefined);
	};

	props.signal.addEventListener("abort", cancel, { once: true });
	try {
		while (!props.signal.aborted) {
			const chunk = await reader.read();
			if (chunk.done) break;

			size += chunk.value.byteLength;
			if (size > props.maxBytes) {
				await reader.cancel();
				return { type: "too-large" };
			}
			chunks.push(chunk.value);
		}

		//* a cancelled read finishes as done, so check the signal before trusting the bytes
		if (props.signal.aborted) {
			cancel();
			return { type: "aborted" };
		}

		return { type: "complete", bytes: Buffer.concat(chunks, size) };
	} finally {
		props.signal.removeEventListener("abort", cancel);
		reader.releaseLock();
	}
};

export default readBoundedBody;
