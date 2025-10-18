import crypto from "node:crypto";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import mime from "mime-types";
import T from "../../../../../translations/index.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceGetMeta,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const getMetadata: MediaAdapterServiceGetMeta = async (key) => {
		try {
			const { targetPath } = keyPaths(key, options.uploadDir);
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
			const fileType = await import("file-type");
			const [stats, fileTypeResult] = await Promise.all([
				stat(targetPath),
				fileType.fileTypeFromFile(targetPath),
			]);
			let mimeType: string | null = null;
			if (fileTypeResult) {
				mimeType = fileTypeResult.mime;
			} else {
				const fileExtension = path.extname(targetPath);
				mimeType = mime.lookup(fileExtension) || null;
				if (mimeType === "application/mp4") mimeType = "video/mp4";
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
	return getMetadata;
};
