import fs from "node:fs/promises";
import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";

const getDefaultMediaAdapter = async (config: Config) => {
	await fs.access(".");

	const { default: fileSystemAdapter } = await import(
		"./adapters/file-system/index.js"
	);

	return {
		adapter: await fileSystemAdapter({
			uploadDir: constants.defaultUploadDirectory,
			secretKey: config.secrets.encryption,
		}),
		enabled: true,
	} as const;
};

export default getDefaultMediaAdapter;
