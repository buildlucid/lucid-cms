import { constants, createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import T from "../../../../../translations/index.js";
import {
	createBufferETag,
	matchesETag,
} from "../../../../../utils/http/etag.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceStream,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";
import { readStoredMetadata } from "../metadata.js";

export default (adapterOptions: FileSystemMediaAdapterOptions) => {
	const stream: MediaAdapterServiceStream = async (
		key: string,
		options?: {
			ifNoneMatch?: string;
			range?: {
				start: number;
				end?: number;
			};
		},
	) => {
		try {
			const { targetPath } = keyPaths(key, adapterOptions.uploadDir);
			const fileType = await import("file-type");
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				return {
					error: {
						message: T("file_not_found"),
						status: 404,
					},
					data: undefined,
				};
			}
			const [stats, fileTypeResult] = await Promise.all([
				stat(targetPath),
				fileType.fileTypeFromFile(targetPath),
			]);
			const etag = createBufferETag(
				Buffer.from(`${stats.mtime.getTime()}-${stats.size}`),
			);
			let mimeType: string | undefined;
			const totalSize = stats.size;
			if (fileTypeResult) {
				mimeType = fileTypeResult.mime;
			} else {
				mimeType =
					(await readStoredMetadata(adapterOptions.uploadDir, key))?.mimeType ??
					undefined;
			}

			if (!options?.range && matchesETag(options?.ifNoneMatch, etag)) {
				return {
					error: undefined,
					data: {
						contentLength: undefined,
						contentType: mimeType || undefined,
						body: new Uint8Array(),
						etag,
						notModified: true,
					},
				};
			}

			//* handle range requests
			if (options?.range) {
				const start = options.range.start;
				const end = options.range.end ?? totalSize - 1;
				//* validate range
				if (start >= totalSize || end >= totalSize || start > end) {
					return {
						error: {
							message: "Invalid range",
							status: 416,
						},
						data: undefined,
					};
				}
				const body = createReadStream(targetPath, { start, end });
				const contentLength = end - start + 1;
				return {
					error: undefined,
					data: {
						contentLength,
						contentType: mimeType || undefined,
						body: body,
						etag,
						isPartialContent: true,
						totalSize,
						range: { start, end },
					},
				};
			}
			//* normal streaming (no range)
			const body = createReadStream(targetPath);
			return {
				error: undefined,
				data: {
					contentLength: totalSize,
					contentType: mimeType || undefined,
					body: body,
					etag,
					isPartialContent: false,
					totalSize,
				},
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: error.message,
					status: 500,
				},
				data: undefined,
			};
		}
	};
	return stream;
};
