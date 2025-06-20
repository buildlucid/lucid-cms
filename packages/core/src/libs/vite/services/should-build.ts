import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import getBuildMetadata from "./get-build-metadata.js";
import constants from "../../../constants/constants.js";
import getPaths from "./get-paths.js";
import generateBuildMetadata from "../generators/build-metadata.js";
import getConfigPath from "../../config/get-config-path.js";
import type { Config, ServiceResponse } from "../../../types.js";

/**
 * Determines if we need to build the admin SPA. Build if:
 * - lucid was started with the --no-cache argument
 * - there is no built version currently
 * - the users lucid.config.ts/js file has been changed since last build
 * - the user CWD package.json has been updated since last build
 * - @lucidcms/admin package.json version has been updated since
 * @todo add logging to any throw errors of resposne
 */
const shouldBuild = async (config: Config): ServiceResponse<boolean> => {
	try {
		const paths = getPaths(config);
		const configPath = getConfigPath(process.cwd()); // can throw

		//* always rebuild if --no-cache argument is present
		if (process.argv.includes(constants.arguments.noCache)) {
			await generateBuildMetadata("no-cache", configPath, config);
			return {
				data: true,
				error: undefined,
			};
		}

		//* always build if one doesnt exist
		if (!existsSync(paths.clientDist)) {
			await generateBuildMetadata("missing", configPath, config);
			return {
				data: true,
				error: undefined,
			};
		}

		//* fetch existing metadata
		const buildMetadataRes = await getBuildMetadata(config);
		if (buildMetadataRes.error) return buildMetadataRes;

		if (buildMetadataRes.data === null) {
			await generateBuildMetadata("missing", configPath, config);
			return {
				data: true,
				error: undefined,
			};
		}

		//* check lucid config file for changes
		const configStat = await fs.stat(configPath);
		if (configStat.mtimeMs !== buildMetadataRes.data.configHash) {
			await generateBuildMetadata("config-hash", configPath, config, {
				config: configStat.mtimeMs,
			});
			return {
				data: true,
				error: undefined,
			};
		}

		//* check cwd package.json for changes
		const usersPackage = await fs.stat(paths.cwdPackageJson);
		if (usersPackage.mtimeMs !== buildMetadataRes.data.cwdPackageHash) {
			await generateBuildMetadata("cwd-package-hash", configPath, config, {
				cwdPackage: usersPackage.mtimeMs,
			});
			return {
				data: true,
				error: undefined,
			};
		}

		//* check @lucidcms/admin/packages.json for changes
		const adminPackage = await fs.stat(paths.adminPackageJson);
		if (adminPackage.mtimeMs !== buildMetadataRes.data.adminPackageHash) {
			await generateBuildMetadata("admin-package-hash", configPath, config, {
				cwdPackage: adminPackage.mtimeMs,
			});
			return {
				data: true,
				error: undefined,
			};
		}

		//* check @lucidcms/core/package.json for changes
		const corePackage = await fs.stat(paths.corePackageJson);
		if (corePackage.mtimeMs !== buildMetadataRes.data.corePackageHash) {
			await generateBuildMetadata("core-package-hash", configPath, config, {
				cwdPackage: corePackage.mtimeMs,
			});
			return {
				data: true,
				error: undefined,
			};
		}

		//* dont rebuild
		return {
			data: false,
			error: undefined,
		};
	} catch (err) {
		return {
			data: true,
			error: undefined,
		};
	}
};

export default shouldBuild;
