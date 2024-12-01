import T from "../../../translations/index.js";
import tailwindcss from "@tailwindcss/vite";
import { build } from "vite";
import solidPlugin from "vite-plugin-solid";
import generateClientMount from "../generators/client-mount.js";
import generateHTML from "../generators/html.js";
import copyAdminAssets from "./copy-assets.js";
import type { ServiceResponse } from "../../../types.js";
import getPaths from "./get-paths.js";

/**
 * Programatically build the admin SPA with Vite.
 * @todo Allow users to extend the vite config within the lucid.config.ts/js
 */
const buildApp = async (): ServiceResponse<undefined> => {
	try {
		const paths = getPaths();

		const [clientMountRes, clientHtmlRes] = await Promise.all([
			generateClientMount(),
			generateHTML(),
		]);
		if (clientHtmlRes.error) return clientHtmlRes;
		if (clientMountRes.error) return clientMountRes;

		await build({
			plugins: [tailwindcss(), solidPlugin()],
			root: paths.clientDirectory,
			build: {
				outDir: paths.clientDist,
				emptyOutDir: true,
				rollupOptions: {
					input: paths.clientHtml,
				},
			},
			base: "/admin",
			// logLevel: "silent",
		});

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
