import { open } from "node:fs/promises";
import { StringDecoder } from "node:string_decoder";
import type { ProgressEvent } from "./types.ts";

/**
 * Reads a job's events file as it grows. Each `read` returns the events written since the last
 * one. A line that is still being written waits for the next read.
 */
const createProgressReader = (file: string) => {
	const decoder = new StringDecoder("utf8");
	let offset = 0;
	let partial = "";

	return {
		read: async (): Promise<ProgressEvent[]> => {
			const handle = await open(file, "r").catch(() => undefined);
			if (!handle) {
				return [];
			}

			try {
				const { size } = await handle.stat();
				if (size <= offset) {
					return [];
				}
				const buffer = Buffer.alloc(size - offset);
				const { bytesRead } = await handle.read(
					buffer,
					0,
					buffer.length,
					offset,
				);
				offset += bytesRead;

				const lines = (
					partial + decoder.write(buffer.subarray(0, bytesRead))
				).split("\n");
				partial = lines.pop() ?? "";
				return lines.flatMap((line) => {
					try {
						return line ? [JSON.parse(line) as ProgressEvent] : [];
					} catch {
						return [];
					}
				});
			} finally {
				await handle.close();
			}
		},
	};
};

export type ProgressReader = ReturnType<typeof createProgressReader>;

export default createProgressReader;
