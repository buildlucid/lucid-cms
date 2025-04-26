import fs from "fs-extra";
import { keyPaths } from "../utils/helpers.js";
import type { PluginOptions } from "../types/types.js";
import type { MediaStrategyUploadSingle } from "@lucidcms/core/types";

export default (pluginOptions: PluginOptions) => {
	const uploadSingle: MediaStrategyUploadSingle = async (props) => {
		try {
			const { targetDir, targetPath } = keyPaths(
				props.key,
				pluginOptions.uploadDir,
			);

			await fs.ensureDir(targetDir);

			if (Buffer.isBuffer(props.data)) {
				await fs.writeFile(targetPath, props.data as unknown as Uint8Array);
			} else {
				const writeStream = fs.createWriteStream(targetPath);
				props.data.pipe(writeStream);
				await new Promise<void>((resolve, reject) => {
					writeStream.on("finish", resolve);
					writeStream.on("error", reject);
				});
			}

			return {
				error: undefined,
				data: {},
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

	return uploadSingle;
};
