import type {
	ResolvedLucidConfig,
	ServiceResponse,
} from "../../../exports/types.js";
import getBuildPaths from "../../cli/services/get-build-paths.js";
import prepareLucidSPA from "../../compile/prepare-lucid-spa.js";

/**
 * Programatically build the admin SPA with Vite.
 */
const buildApp = async (
	config: ResolvedLucidConfig,
): ServiceResponse<undefined> => {
	const paths = getBuildPaths(config);

	return prepareLucidSPA({
		outDir: paths.spaOutput,
	});
};

export default buildApp;
