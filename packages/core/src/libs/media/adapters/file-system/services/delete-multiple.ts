import { constants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import { text } from "../../../../i18n/index.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceDeleteMultiple,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const deleteMultiple: MediaAdapterServiceDeleteMultiple = async (keys) => {
		try {
			for (const key of keys) {
				const { targetPath } = keyPaths(key, options.uploadDir);
				try {
					await access(targetPath, constants.F_OK);
					await unlink(targetPath);
					await deleteStoredMetadata(options.uploadDir, key);
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
					message: text.server("core.errors.default.message", {
						defaultMessage: error.message,
					}),
				},
				data: undefined,
			};
		}
	};
	return deleteMultiple;
};
