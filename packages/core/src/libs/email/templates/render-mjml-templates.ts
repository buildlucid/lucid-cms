import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mjml2html from "mjml";
import type { Config } from "../../../types.js";
import { getDirName } from "../../../utils/helpers/index.js";
import cliLogger from "../../cli/logger.js";
import type { RenderedTemplates } from "../types.js";

const currentDir = getDirName(import.meta.url);

const pathExists = async (targetPath: string): Promise<boolean> => {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
};

const processTemplatesInDirectory = async (
	directory: string,
	renderedTemplates: RenderedTemplates,
	overwrite = true,
	silent = false,
): Promise<void> => {
	if (!(await pathExists(directory))) return;

	const files = await readdir(directory);
	const mjmlFiles = files.filter((file) => file.endsWith(".mjml"));

	await Promise.all(
		mjmlFiles.map(async (file) => {
			const templateName = file.replace(".mjml", "");

			if (!overwrite && renderedTemplates[templateName]) {
				return;
			}

			const filePath = path.join(directory, file);
			const mjmlContent = await readFile(filePath, "utf-8");
			const htmlOutput = await mjml2html(mjmlContent);

			renderedTemplates[templateName] = {
				html: htmlOutput.html,
				lastModified: new Date().toISOString(),
			};

			cliLogger.info(
				"Pre-rendered email template:",
				cliLogger.color.green(templateName),
				{ silent },
			);
		}),
	);
};

const renderMjmlTemplates = async (props: {
	config: Config;
	silent?: boolean;
}): Promise<RenderedTemplates> => {
	const silent = props.silent ?? false;
	const renderedTemplates: RenderedTemplates = {};

	const projectTemplatePath = props.config.build.paths.emailTemplates;
	const packageTemplatePath = path.join(currentDir, "../../../../templates");

	await processTemplatesInDirectory(
		projectTemplatePath,
		renderedTemplates,
		true,
		silent,
	);
	await processTemplatesInDirectory(
		packageTemplatePath,
		renderedTemplates,
		false,
		silent,
	);

	return renderedTemplates;
};

export default renderMjmlTemplates;
