import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";

/**
 * The filesystem media adapter is only valid when the current runtime exposes
 * Node's fs APIs, so we keep that capability check behind a lazy boundary.
 */
const getDefaultMediaAdapter = async (config: Config) => {
	const fsSpecifier = ["node:fs", "promises"].join("/");
	const fs = (await import(fsSpecifier)) as typeof import("node:fs/promises");
	await fs.access(".");

	const fileSystemAdapterSpecifier = [
		".",
		"adapters",
		"file-system",
		"index.js",
	].join("/");
	const { default: fileSystemAdapter } = (await import(
		fileSystemAdapterSpecifier
	)) as {
		default: typeof import("./adapters/file-system/index.js")["default"];
	};

	return fileSystemAdapter({
		uploadDir: constants.defaultUploadDirectory,
		secretKey: config.secrets.encryption,
	});
};

export default getDefaultMediaAdapter;
