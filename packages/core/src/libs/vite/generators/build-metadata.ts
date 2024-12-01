import T from "../../../translations/index.js";
import fs from "node:fs/promises";
import getPaths from "../services/get-paths.js";
import type { ServiceResponse } from "../../../types.js";

export type BuildMetadata = {
	buildTrigger:
		| "no-cache"
		| "missing"
		| "config-hash"
		| "cwd-package-hash"
		| "admin-package-hash"
		| "core-package-hash";
	timestamp: number;
	configHash: string;
	cwdPackageHash: string;
	adminPackageHash: string;
	corePackageHash: string;
};

/**
 * Generates the .lucid/client/build-metadata.json file
 */
const generateBuildMetadata = async (
	data: Omit<BuildMetadata, "timestamp">,
): ServiceResponse<undefined> => {
	try {
		const paths = getPaths();

		const content = JSON.stringify({
			timestamp: new Date().getMilliseconds(),
			buildTrigger: data.buildTrigger,
			configHash: data.configHash,
			cwdPackageHash: data.cwdPackageHash,
			adminPackageHash: data.adminPackageHash,
			corePackageHash: data.corePackageHash,
		} satisfies BuildMetadata);

		await fs.mkdir(paths.clientDirectory, { recursive: true });
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
