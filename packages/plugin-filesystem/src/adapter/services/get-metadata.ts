import crypto from "node:crypto";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceGetMeta,
} from "@lucidcms/core/types";
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
				return {
					error: {
						message: copy("server:plugin.filesystem.media.files.not.found"),
						status: 404,
					},
					data: undefined,
				};
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
				mimeType =
					(await readStoredMetadata(options.uploadDir, props.key))?.mimeType ??
					null;
			}
			const etag = crypto
				.createHash("md5")
				.update(`${stats.mtime.getTime()}-${stats.size}`)
				.digest("hex");
			return {
				error: undefined,
				data: {
					size: stats.size,
					mimeType: mimeType,
					etag: etag,
					status: "ready",
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
	return getMetadata;
};
