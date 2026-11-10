import { rm } from "node:fs/promises";
import { copy, LucidError } from "@lucidcms/core";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceDeleteSingle,
} from "@lucidcms/core/types";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const deleteSingle: MediaStorageAdapterServiceDeleteSingle = async (
		_context,
		props,
	) => {
		try {
			const { targetPath } = keyPaths(props.key, options.uploadDir);
			await rm(targetPath, { force: true });
			await deleteStoredMetadata(options.uploadDir, props.key);
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
	return deleteSingle;
};
