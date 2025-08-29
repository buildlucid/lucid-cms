import T from "../../../translations/index.js";
import fs from "node:fs/promises";
import type { VitePaths } from "../services/get-paths.js";
import type { ServiceResponse } from "../../../types.js";
import { ensureLucidDirectoryExists } from "../../../utils/helpers/lucid-directory.js";

export type BuildMetadata = {
	buildTrigger:
		| "no-cache"
		| "missing"
		| "config-hash"
		| "cwd-package-hash"
		| "admin-package-hash"
		| "core-package-hash";
	timestamp: number;
	configHash: number;
	cwdPackageHash: number;
	adminPackageHash: number;
	corePackageHash: number;
};

/**
 * Generates the .lucid/spa-build-metadata.json file
 */
const generateBuildMetadata = async (
	trigger: BuildMetadata["buildTrigger"],
	configPath: string,
	paths: VitePaths,
	hashes?: {
		config?: number;
		cwdPackage?: number;
		adminPackage?: number;
		corePackage?: number;
	},
): ServiceResponse<undefined> => {
	try {
		const [configStat, cwdStat, adminStat, coreStat] = await Promise.all([
			hashes?.config ? null : fs.stat(configPath),
			hashes?.cwdPackage ? null : fs.stat(paths.cwdPackageJson),
			hashes?.adminPackage ? null : fs.stat(paths.adminPackageJson),
			hashes?.corePackage ? null : fs.stat(paths.corePackageJson),
		]);

		const content = JSON.stringify({
			timestamp: Date.now(),
			buildTrigger: trigger,
			configHash: hashes?.config ?? configStat?.mtimeMs ?? -1,
			cwdPackageHash: hashes?.cwdPackage ?? cwdStat?.mtimeMs ?? -1,
			adminPackageHash: hashes?.adminPackage ?? adminStat?.mtimeMs ?? -1,
			corePackageHash: hashes?.corePackage ?? coreStat?.mtimeMs ?? -1,
		} satisfies BuildMetadata);

		await ensureLucidDirectoryExists();
		await fs.writeFile(paths.buildMetadata, content, "utf-8");

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error
						? err.message
						: T("vite_build_meta_generation_error"),
			},
		};
	}
};

export default generateBuildMetadata;
