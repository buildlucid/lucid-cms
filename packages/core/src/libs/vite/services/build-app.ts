import { buildAdmin } from "@lucidcms/admin/build";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import getBuildPaths from "../../runtime/get-build-paths.js";

/** Builds the admin into the standalone application's public directory. */
const buildApp = async (config: ResolvedLucidConfig, silent = false) => {
	await buildAdmin({
		projectRoot: process.cwd(),
		outDir: getBuildPaths(config).spaOutput,
		logLevel: silent ? "silent" : "warn",
	});
};
export default buildApp;
