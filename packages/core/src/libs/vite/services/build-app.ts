import T from "../../../translations/index.js";
import { build } from "vite";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";
import copyAdminAssets from "./copy-assets.js";
import mergeViteConfig from "./merge-vite-config.js";
import type { Config, ServiceResponse } from "../../../types.js";
import shouldBuild from "./should-build.js";

/**
 * Programatically build the admin SPA with Vite.
 * @todo Allow users to extend the vite config within the lucid.config.ts/js
 */
const buildApp = async (config: Config): ServiceResponse<undefined> => {
	try {
		const buildAdmin = await shouldBuild();
		if (buildAdmin.error) return buildAdmin;
		if (buildAdmin.data === false)
			return {
				data: undefined,
				error: undefined,
			};

		const [clientMountRes, clientHtmlRes] = await Promise.all([
			generateClientMount(),
			generateHTML(),
		]);
		if (clientHtmlRes.error) return clientHtmlRes;
		if (clientMountRes.error) return clientMountRes;

		const inlineConfig = mergeViteConfig(config);
		await build(inlineConfig);

		const copyAssetRes = await copyAdminAssets(["favicon.ico"]);
		if (copyAssetRes.error) return copyAssetRes;

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
