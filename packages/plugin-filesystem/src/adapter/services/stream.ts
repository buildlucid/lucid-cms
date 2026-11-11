import { constants, createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { copy, LucidError } from "@lucidcms/core";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceStream,
} from "@lucidcms/core/types";
import { createFileETag, matchesETag } from "../etag.js";
import { keyPaths } from "../helpers.js";
import { readStoredMetadata } from "../metadata.js";

export default (adapterOptions: FileSystemStorageAdapterOptions) => {
	const stream: MediaStorageAdapterServiceStream = async (_context, props) => {
		try {
			const { targetPath } = keyPaths(props.key, adapterOptions.uploadDir);
			const fileType = await import("file-type");
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				throw new LucidError({
					message: copy("server:plugin.filesystem.media.files.not.found"),
					status: 404,
				});
			}
			const [stats, fileTypeResult] = await Promise.all([
				stat(targetPath),
				fileType.fileTypeFromFile(targetPath),
			]);
			const etag = createFileETag(stats);
			let mimeType: string | undefined;
			const totalSize = stats.size;
			if (fileTypeResult) {
				mimeType = fileTypeResult.mime;
			} else {
				mimeType = (await readStoredMetadata(props.key))?.mimeType ?? undefined;
			}

			if (!props.range && matchesETag(props.ifNoneMatch, etag)) {
				return {
					contentLength: undefined,
					contentType: mimeType || undefined,
					body: new Uint8Array(),
					etag,
					notModified: true,
				};
			}

			//* handle range requests
			if (props.range) {
				const start = props.range.start;
				//* a range may run past the end, which is read as up to the last byte
				const end = Math.min(props.range.end ?? totalSize - 1, totalSize - 1);
				if (start >= totalSize || start > end) {
					throw new LucidError({
						message: copy(
							"server:plugin.filesystem.media.stream.range.invalid",
						),
						status: 416,
					});
				}
				const body = createReadStream(targetPath, { start, end });
				const contentLength = end - start + 1;
				return {
					contentLength,
					contentType: mimeType || undefined,
					body: body,
					etag,
					isPartialContent: true,
					totalSize,
					range: { start, end },
				};
			}
			//* normal streaming (no range)
			const body = createReadStream(targetPath);
			return {
				contentLength: totalSize,
				contentType: mimeType || undefined,
				body: body,
				etag,
				isPartialContent: false,
				totalSize,
			};
		} catch (e) {
			if (e instanceof LucidError) throw e;
			const error = e as Error;
			throw new LucidError({
				message: copy("server:plugin.filesystem.media.errors.default.message", {
					defaultMessage: error.message,
				}),
				status: 500,
			});
		}
	};
	return stream;
};
