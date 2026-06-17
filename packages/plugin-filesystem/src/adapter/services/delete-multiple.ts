import { constants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceDeleteMultiple,
} from "@lucidcms/core/types";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const deleteMultiple: MediaAdapterServiceDeleteMultiple = async (props) => {
		try {
			for (const key of props.keys) {
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
	return deleteMultiple;
};
