import type { Config, ServiceResponse } from "../../../types.js";
import prepareLucidSPA from "../../assets/prepare-lucid-spa.js";
import getBuildPaths from "../../cli/services/get-build-paths.js";

/**
 * Programatically build the admin SPA with Vite.
 */
const buildApp = async (config: Config): ServiceResponse<undefined> => {
	const paths = getBuildPaths(config);

	return prepareLucidSPA({
		outDir: paths.spaOutput,
	});
};

export default buildApp;
