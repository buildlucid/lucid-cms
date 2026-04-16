import path from "node:path";
import constants from "../../../constants/constants.js";
import type { Config, ServiceResponse } from "../../../types.js";
import prepareLucidPublicAssets from "../../compile/prepare-lucid-public-assets.js";

/**
 * Copies the public assets from various sources into the output directory.
 */
const copyPublicAssets = async (props: {
	config: Config;
	silent?: boolean;
}): ServiceResponse<undefined> => {
	const outDir = path.join(
		props.config.build.paths.outDir,
		constants.directories.public,
	);

	return prepareLucidPublicAssets({
		config: props.config,
		outDir,
		projectRoot: process.cwd(),
		includeProjectPublic: true,
		silent: props.silent,
	});
};

export default copyPublicAssets;
