import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";

/**
 * The filesystem media adapter is only valid when the current runtime exposes
 * Node's fs APIs, so we keep that capability check behind a lazy boundary.
 */
const getDefaultMediaAdapter = async (config: Config) => {
	const fs = await import("node:fs/promises");
	await fs.access(".");

	const { default: fileSystemAdapter } = await import(
		`./adapters/file-system/index.js`
	);

	return fileSystemAdapter({
		uploadDir: constants.defaultUploadDirectory,
		secretKey: config.secrets.encryption,
	});
};

export default getDefaultMediaAdapter;
