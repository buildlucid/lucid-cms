import { constants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import T from "../../../../../translations/index.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceDeleteSingle,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const deletSingle: MediaAdapterServiceDeleteSingle = async (key) => {
		try {
			const { targetPath } = keyPaths(key, options.uploadDir);
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				return {
					error: {
						message: T("file_not_found"),
					},
					data: undefined,
				};
			}
			await unlink(targetPath);
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
	return deletSingle;
};
