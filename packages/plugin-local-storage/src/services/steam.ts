import T from "../translations/index.js";
import fs from "fs-extra";
import path from "node:path";
import mime from "mime-types";
import { keyPaths } from "../utils/helpers.js";
import { fileTypeFromFile } from "file-type";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyStream } from "@lucidcms/core/types";

export default (pluginOptions: PluginOptions) => {
	const stream: MediaStrategyStream = async (
		key: string,
		options?: {
			range?: {
				start: number;
				end?: number;
			};
		},
	) => {
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
			let mimeType: string | undefined;
			const totalSize = stats.size;

			if (fileTypeResult) {
				mimeType = fileTypeResult.mime;
			} else {
				const fileExtension = path.extname(targetPath);
				mimeType = mime.lookup(fileExtension) || undefined;
				if (mimeType === "application/mp4") mimeType = "video/mp4";
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

				const body = fs.createReadStream(targetPath, { start, end });
				const contentLength = end - start + 1;

				return {
					error: undefined,
					data: {
						contentLength,
						contentType: mimeType || undefined,
						body: body,
						isPartialContent: true,
						totalSize,
						range: { start, end },
					},
				};
			}

			//* normal streaming (no range)
			const body = fs.createReadStream(targetPath);

			return {
				error: undefined,
				data: {
					contentLength: totalSize,
					contentType: mimeType || undefined,
					body: body,
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
