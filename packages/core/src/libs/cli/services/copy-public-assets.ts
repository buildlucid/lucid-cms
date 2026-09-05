import path from "node:path";
import constants from "../../../constants/constants.js";
import type { Config, ServiceResponse } from "../../../exports/types.js";
import prepareLucidPublicAssets from "../../compile/prepare-lucid-public-assets.js";
import type { ResourceFile } from "../../resources/types.js";

/**
 * Copies the public assets from various sources into the output directory.
 */
const copyPublicAssets = async (props: {
	config: Config;
	files: ResourceFile[];
	silent?: boolean;
	verbose?: boolean;
}): ServiceResponse<undefined> => {
	const outDir = path.join(
		props.config.build.outDir,
		constants.directories.public,
	);

	return prepareLucidPublicAssets({
		files: props.files,
		outDir,
		projectRoot: process.cwd(),
		silent: props.silent,
		verbose: props.verbose,
	});
};

export default copyPublicAssets;
