import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { copy, LucidError } from "@lucidcms/core";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceGetMeta,
} from "@lucidcms/core/types";
import { createFileETag } from "../etag.js";
import { keyPaths } from "../helpers.js";
import { readStoredMetadata } from "../metadata.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const getMetadata: MediaStorageAdapterServiceGetMeta = async (
		_context,
		props,
	) => {
		try {
			const { targetPath } = keyPaths(props.key, options.uploadDir);
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				throw new LucidError({
					message: copy("server:plugin.filesystem.media.files.not.found"),
					status: 404,
				});
			}
			const fileType = await import("file-type");
			const [stats, fileTypeResult] = await Promise.all([
				stat(targetPath),
				fileType.fileTypeFromFile(targetPath),
			]);
			let mimeType: string | null = null;
			if (fileTypeResult) {
				mimeType = fileTypeResult.mime;
			} else {
				mimeType = (await readStoredMetadata(props.key))?.mimeType ?? null;
			}
			const etag = createFileETag(stats);
			return {
				size: stats.size,
				mimeType: mimeType,
				etag: etag,
				status: "ready",
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
	return getMetadata;
};
