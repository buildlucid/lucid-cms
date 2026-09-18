import { buildAdmin } from "@lucidcms/admin/build";
import type { ResolvedLucidConfig } from "../../types/config.js";
import getBuildPaths from "../runtime/get-build-paths.js";
import createAdminClientConfig from "./create-client-config.js";

/** Builds the admin into the standalone application's public directory. */
const buildApp = async ({
	config,
	projectRoot,
	configPath,
	silent = false,
}: {
	config: ResolvedLucidConfig;
	projectRoot: string;
	configPath: string;
	silent?: boolean;
}) => {
	await buildAdmin({
		projectRoot,
		configPath,
		admin: config.admin,
		clientConfig: createAdminClientConfig(config),
		outDir: getBuildPaths(config).spaOutput,
		logLevel: silent ? "silent" : "warn",
	});
};
export default buildApp;
