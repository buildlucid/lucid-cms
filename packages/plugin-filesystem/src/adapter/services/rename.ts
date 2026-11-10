import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { copy, LucidError } from "@lucidcms/core";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceRenameKey,
} from "@lucidcms/core/types";
import { keyPaths } from "../helpers.js";
import { copyStoredMetadata, deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const rename: MediaStorageAdapterServiceRenameKey = async (
		_context,
		props,
	) => {
		try {
			const from = keyPaths(props.from, options.uploadDir);
			const to = keyPaths(props.to, options.uploadDir);

			await mkdir(path.dirname(to.targetPath), { recursive: true });
			await copyFile(from.targetPath, to.targetPath);
			await copyStoredMetadata(options.uploadDir, props.from, props.to);
			await rm(from.targetPath);
			await deleteStoredMetadata(options.uploadDir, props.from);

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
	return rename;
};
