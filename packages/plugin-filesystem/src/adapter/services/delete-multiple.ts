import { rm } from "node:fs/promises";
import { copy, LucidError } from "@lucidcms/core";
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
			return;
		} catch (e) {
			if (e instanceof LucidError) throw e;
			const error = e as Error;
			throw new LucidError({
				message: copy("server:plugin.filesystem.media.errors.default.message", {
					defaultMessage: error.message,
				}),
			});
		}
	};
	return deleteMultiple;
};
