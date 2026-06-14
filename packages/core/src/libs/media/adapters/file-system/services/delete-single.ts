import { constants } from "node:fs";
import { access, unlink } from "node:fs/promises";
import { copy } from "../../../../i18n/index.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceDeleteSingle,
} from "../../../types.js";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata } from "../metadata.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const deletSingle: MediaAdapterServiceDeleteSingle = async (props) => {
		try {
			const { targetPath } = keyPaths(props.key, options.uploadDir);
			try {
				await access(targetPath, constants.F_OK);
			} catch {
				return {
					error: {
						message: copy("server:core.files.not.found"),
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
					message: copy("server:core.errors.default.message", {
						defaultMessage: error.message,
					}),
				},
				data: undefined,
			};
		}
	};
	return deletSingle;
};
