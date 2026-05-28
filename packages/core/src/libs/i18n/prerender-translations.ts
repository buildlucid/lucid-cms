import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import { serverText } from "./server-text.js";

/**
 * Writes the resolved translation bundle into the build output.
 *
 * Build adapters pass this artifact back into config resolution so runtimes
 * without filesystem access can still use project translation files.
 */
const prerenderTranslations = async (props: {
	config: Config;
}): ServiceResponse<undefined> => {
	try {
		await mkdir(props.config.build.paths.outDir, { recursive: true });
		await writeFile(
			path.join(props.config.build.paths.outDir, constants.i18n.renderedOutput),
			JSON.stringify(props.config.i18n.translations, null, 2),
		);

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				message: serverText(
					"core.i18n.prerender.failed",
					error instanceof Error ? { fallback: error.message } : undefined,
				),
				status: 500,
			},
			data: undefined,
		};
	}
};

export default prerenderTranslations;
