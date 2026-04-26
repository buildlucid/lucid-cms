import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import type { Config } from "../../../types.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import renderMjmlTemplates from "./render-mjml-templates.js";

/**
 * Pre-renders all configured MJML templates to a JSON artifact in the build output.
 */
const prerenderMjmlTemplates = async (props: {
	config: Config;
	silent?: boolean;
}): ServiceResponse<undefined> => {
	try {
		const renderedTemplates = await renderMjmlTemplates(props);

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
				message:
					error instanceof Error
						? error.message
						: T("failed_to_prerender_mjml_templates"),
				status: 500,
			},
			data: undefined,
		};
	}
};

export default prerenderMjmlTemplates;
