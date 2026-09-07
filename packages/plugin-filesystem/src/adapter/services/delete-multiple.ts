import { rm } from "node:fs/promises";
import { copy } from "@lucidcms/core";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceDeleteMultiple,
} from "@lucidcms/core/types";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const deleteMultiple: MediaStorageAdapterServiceDeleteMultiple = async (
		_context,
		props,
	) => {
		try {
			for (const key of props.keys) {
				const { targetPath } = keyPaths(key, options.uploadDir);
				await rm(targetPath, { force: true });
				await deleteStoredMetadata(options.uploadDir, key);
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
