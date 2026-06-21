import { createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceUploadSingle,
} from "@lucidcms/core/types";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata, writeStoredMetadata } from "../metadata.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const uploadSingle: MediaAdapterServiceUploadSingle = async (
		_context,
		props,
	) => {
		const { targetDir, targetPath } = keyPaths(props.key, options.uploadDir);

		const cleanup = async () => {
			await Promise.allSettled([
				rm(targetPath),
				deleteStoredMetadata(options.uploadDir, props.key),
			]);
		};

		try {
			await mkdir(targetDir, { recursive: true });
			if (Buffer.isBuffer(props.body)) {
				await writeFile(targetPath, props.body);
			} else {
				const writeStream = createWriteStream(targetPath);
				const readable =
					props.body instanceof Readable
						? props.body
						: Readable.fromWeb(props.body as never);
				readable.pipe(writeStream);
				await new Promise<void>((resolve, reject) => {
					writeStream.on("finish", resolve);
					writeStream.on("error", reject);
				});
			}

			await writeStoredMetadata(options.uploadDir, props.key, {
				mimeType: props.mimeType,
				extension: props.extension,
			});

			return {
				error: undefined,
				data: {},
			};
		} catch (e) {
			await cleanup();
			const error = e as Error;
			return {
				error: {
					message: copy(
						"server:plugin.filesystem.media.errors.default.message",
						{
							defaultMessage: error.message,
						},
					),
				},
				data: undefined,
			};
		}
	};
	return uploadSingle;
};
