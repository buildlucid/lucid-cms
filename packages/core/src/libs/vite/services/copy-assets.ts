import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import constants from "../../../constants/constants.js";
import { join } from "node:path";
import { copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { Config } from "../../../types/config.js";

/**
 * Copies the given assets from the @lucidcms/admin/assets export to the CWD vite builds asset directory.
 */
const copyAdminAssets = async (
	assets: string[],
	config: Config,
): ServiceResponse<undefined> => {
	try {
		const cwd = process.cwd();
		const require = createRequire(import.meta.url);
		const copyFiles = [];

		for (const asset of assets) {
			const source = require.resolve(`@lucidcms/admin/assets/${asset}`);
			const destination = join(
				cwd,
				config.compilerOptions.paths.outDir,
				constants.directories.public,
				constants.vite.dist,
				"assets",
				asset,
			);
			copyFiles.push(copyFile(source, destination));
		}

		await Promise.all(copyFiles);

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			error: {
				message:
					err instanceof Error
						? err.message
						: T("vite_build_error_copy_assets_error"),
			},
			data: undefined,
		};
	}
};

export default copyAdminAssets;
