import T from "../../../translations/index.js";
import fs from "node:fs/promises";
import getPaths from "./get-paths.js";
import type { Config, ServiceResponse } from "../../../types.js";
import type { BuildMetadata } from "../generators/build-metadata.js";

/**
 * Fetches the .lucid/client/build-metadata.json file if it exists, else returns null.
 * @todo Add validation to determine if the returned data is correct, if its not return null instead of throwing / returning an error.
 */
const getBuildMetadata = async (
	config: Config,
): ServiceResponse<BuildMetadata | null> => {
	try {
		const paths = getPaths(config);

		try {
			await fs.access(paths.buildMetadata);
		} catch {
			return {
				data: null,
				error: undefined,
			};
		}

		const fileRes = await fs.readFile(paths.buildMetadata, {
			encoding: "utf8",
		});
		const buildMetadata = JSON.parse(fileRes);

		return {
			data: buildMetadata,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error ? err.message : T("vite_build_meta_read_error"),
			},
		};
	}
};

export default getBuildMetadata;
