import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { copy } from "@lucidcms/core/plugin";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceRenameKey,
} from "@lucidcms/core/types";
import { keyPaths } from "../helpers.js";
import { copyStoredMetadata, deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const rename: MediaAdapterServiceRenameKey = async (_context, props) => {
		try {
			const from = keyPaths(props.from, options.uploadDir);
			const to = keyPaths(props.to, options.uploadDir);

			await mkdir(path.dirname(to.targetPath), { recursive: true });
			await copyFile(from.targetPath, to.targetPath);
			await copyStoredMetadata(options.uploadDir, props.from, props.to);
			await rm(from.targetPath);
			await deleteStoredMetadata(options.uploadDir, props.from);

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
	return rename;
};
