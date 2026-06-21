import { constants, createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceStream,
} from "@lucidcms/core/types";
import { createBufferETag, matchesETag } from "../etag.js";
import { keyPaths } from "../helpers.js";
import { readStoredMetadata } from "../metadata.js";

export default (adapterOptions: FileSystemMediaAdapterOptions) => {
	const stream: MediaAdapterServiceStream = async (_context, props) => {
		try {
			const { targetPath } = keyPaths(props.key, adapterOptions.uploadDir);
			const fileType = await import("file-type");
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				return {
					error: {
						message: copy("server:plugin.filesystem.media.files.not.found"),
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
					(await readStoredMetadata(adapterOptions.uploadDir, props.key))
						?.mimeType ?? undefined;
			}

			if (!props.range && matchesETag(props.ifNoneMatch, etag)) {
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
			if (props.range) {
				const start = props.range.start;
				const end = props.range.end ?? totalSize - 1;
				//* validate range
				if (start >= totalSize || end >= totalSize || start > end) {
					return {
						error: {
							message: copy(
								"server:plugin.filesystem.media.stream.range.invalid",
							),
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
					message: copy(
						"server:plugin.filesystem.media.errors.default.message",
						{
							defaultMessage: error.message,
						},
					),
					status: 500,
				},
				data: undefined,
			};
		}
	};
	return stream;
};
