import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceUploadSingle,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const uploadSingle: MediaAdapterServiceUploadSingle = async (props) => {
		try {
			const { targetDir, targetPath } = keyPaths(props.key, options.uploadDir);
			await mkdir(targetDir, { recursive: true });
			if (Buffer.isBuffer(props.data)) {
				await writeFile(targetPath, props.data);
			} else {
				const writeStream = createWriteStream(targetPath);
				props.data.pipe(writeStream);
				await new Promise<void>((resolve, reject) => {
					writeStream.on("finish", resolve);
					writeStream.on("error", reject);
				});
			}
			return {
				error: undefined,
				data: {},
			};
		} catch (e) {
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
