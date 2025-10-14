import { constants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceDeleteMultiple,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const deleteMultiple: MediaAdapterServiceDeleteMultiple = async (keys) => {
		try {
			for (const key of keys) {
				const { targetPath } = keyPaths(key, options.uploadDir);
				try {
					await access(targetPath, constants.F_OK);
					await unlink(targetPath);
				} catch {}
			}
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
	return deleteMultiple;
};
