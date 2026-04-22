import { createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceUploadSingle,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata, writeStoredMetadata } from "../metadata.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const uploadSingle: MediaAdapterServiceUploadSingle = async (props) => {
		const { targetDir, targetPath } = keyPaths(props.key, options.uploadDir);

		const cleanup = async () => {
			await Promise.allSettled([
				rm(targetPath),
				deleteStoredMetadata(options.uploadDir, props.key),
			]);
		};

		try {
			await mkdir(targetDir, { recursive: true });
			if (Buffer.isBuffer(props.data)) {
				await writeFile(targetPath, props.data);
			} else {
				const writeStream = createWriteStream(targetPath);
				const readable =
					props.data instanceof Readable
						? props.data
						: Readable.fromWeb(props.data as never);
				readable.pipe(writeStream);
				await new Promise<void>((resolve, reject) => {
					writeStream.on("finish", resolve);
					writeStream.on("error", reject);
				});
			}

			await writeStoredMetadata(options.uploadDir, props.key, {
				mimeType: props.meta.mimeType,
				extension: props.meta.extension,
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
					message: error.message,
				},
				data: undefined,
			};
		}
	};
	return uploadSingle;
};
