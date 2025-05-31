import T from "../translations/index.js";
import crypto from "node:crypto";
import { keyPaths } from "../utils/helpers.js";
import fs from "fs-extra";
import path from "node:path";
import mime from "mime-types";
import { fileTypeFromFile } from "file-type";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyGetMeta } from "@lucidcms/core/types";

export default (pluginOptions: PluginOptions) => {
	const getMetadata: MediaStrategyGetMeta = async (key) => {
		try {
			const { targetPath } = keyPaths(key, pluginOptions.uploadDir);
			const exists = await fs.pathExists(targetPath);

			if (!exists) {
				return {
					error: {
						message: T("file_not_found"),
						status: 404,
					},
					data: undefined,
				};
			}

			const [stats, fileTypeResult] = await Promise.all([
				fs.stat(targetPath),
				fileTypeFromFile(targetPath),
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
