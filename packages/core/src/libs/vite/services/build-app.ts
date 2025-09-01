import T from "../../../translations/index.js";
import { build } from "vite";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";
import copyAdminAssets from "./copy-assets.js";
import mergeViteConfig from "./merge-vite-config.js";
import shouldBuild from "./should-build.js";
import {
	skipAdminBuild,
	startAdminBuild,
} from "../../cli/logger/build-spa-logger.js";
import fs from "node:fs/promises";
import { join } from "node:path";
import constants from "../../../constants/constants.js";
import getPaths from "./get-paths.js";
import type { Config, ServiceResponse } from "../../../types.js";

/**
 * Programatically build the admin SPA with Vite.
 */
const buildApp = async (
	config: Config,
	force?: boolean,
	silent?: boolean,
): ServiceResponse<undefined> => {
	try {
		const buildAdmin = await shouldBuild(config);
		if (buildAdmin.error) return buildAdmin;

		if (buildAdmin.data === false && force !== true) {
			skipAdminBuild(silent);
			return {
				data: undefined,
				error: undefined,
			};
		}

		const paths = getPaths(config);
		const inlineConfig = mergeViteConfig(config, paths);
		const endLog = startAdminBuild(silent);

		const [clientMountRes, clientHtmlRes] = await Promise.all([
			generateClientMount(paths),
			generateHTML(paths),
		]);
		if (clientHtmlRes.error) return clientHtmlRes;
		if (clientMountRes.error) return clientMountRes;

		await build(inlineConfig);

		const copyAssetRes = await copyAdminAssets(["favicon.ico"], config);
		if (copyAssetRes.error) return copyAssetRes;

		await fs.rm(
			join(
				config.compilerOptions.paths.outDir,
				constants.directories.public,
				constants.vite.mount,
			),
			{ force: true },
		);
		await fs.rm(
			join(
				config.compilerOptions.paths.outDir,
				constants.directories.public,
				constants.vite.html,
			),
			{ force: true },
		);

		endLog?.();

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error ? err.message : T("vite_build_error_message"),
			},
		};
	}
};

export default buildApp;
