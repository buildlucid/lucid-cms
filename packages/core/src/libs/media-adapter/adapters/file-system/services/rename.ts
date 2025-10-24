import { mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceRenameKey,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const rename: MediaAdapterServiceRenameKey = async (props) => {
		try {
			const from = keyPaths(props.from, options.uploadDir);
			const to = keyPaths(props.to, options.uploadDir);

			await mkdir(path.dirname(to.targetPath), { recursive: true });
			await copyFile(from.targetPath, to.targetPath);
			await rm(from.targetPath);

			return {
				error: undefined,
				data: undefined,
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
	return rename;
};
