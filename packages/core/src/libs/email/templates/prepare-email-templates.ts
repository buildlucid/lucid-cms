import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import type { Config } from "../../../types.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import loadEmailTemplates from "./load-email-templates.js";

/**
 * Writes all configured email templates to a JSON artifact in the build output.
 */
const prepareEmailTemplates = async (props: {
	config: Config;
	silent?: boolean;
}): ServiceResponse<undefined> => {
	try {
		const renderedTemplates = await loadEmailTemplates(props);

		await mkdir(props.config.build.paths.outDir, { recursive: true });

		const outputPath = path.join(
			props.config.build.paths.outDir,
			constants.email.renderedOutput,
		);
		await writeFile(outputPath, JSON.stringify(renderedTemplates, null, 2));

		return {
			error: undefined,
			data: undefined,
		};
	} catch (error) {
		return {
			error: {
				message: copy(
					"server:core.email.templates.prepare.failed",
					error instanceof Error
						? { defaultMessage: error.message }
						: undefined,
				),
				status: 500,
			},
			data: undefined,
		};
	}
};

export default prepareEmailTemplates;
