import { constants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import { copy } from "@lucidcms/core/plugin";
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
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				return {
					error: {
						message: copy("server:plugin.filesystem.media.files.not.found"),
					},
					data: undefined,
				};
			}
			await unlink(targetPath);
			await deleteStoredMetadata(options.uploadDir, props.key);
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
	return deleteSingle;
};
