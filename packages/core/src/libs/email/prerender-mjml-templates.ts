import T from "../../translations/index.js";
import { writeFile, readdir, readFile, access, mkdir } from "node:fs/promises";
import path from "node:path";
import mjml2html from "mjml";
import constants from "../../constants/constants.js";
import { getDirName } from "../../utils/helpers/index.js";
import type { ServiceResponse } from "../../utils/services/types.js";
import type { Config } from "../../types.js";
import type { RenderedTemplates } from "./types.js";

const currentDir = getDirName(import.meta.url);

const pathExists = async (path: string): Promise<boolean> => {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
};

const processTemplatesInDirectory = async (
	directory: string,
	renderedTemplates: RenderedTemplates,
	overwrite = true,
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
		}),
	);
};

/**
 * Pre-renders all of the MJML templates within the core package's templates directory as well as the CWD templates directory.
 *
 * The result of this is stored within the configured output directory which is dynamically loaded at runtime and rendered with user data
 * via handlebars. This way, we can avoid bundling MJML which balloons the size of the bundle a lot.
 */
const prerenderMjmlTemplates = async (
	config: Config,
): ServiceResponse<undefined> => {
	try {
		const renderedTemplates: RenderedTemplates = {};

		await mkdir(config.compilerOptions.paths.outDir, { recursive: true });

		const projectTemplatePath =
			config.compilerOptions.paths.emailTemplates ??
			path.resolve("./templates");
		const packageTemplatePath = path.join(currentDir, "../../../templates");

		await processTemplatesInDirectory(
			projectTemplatePath,
			renderedTemplates,
			true,
		);
		await processTemplatesInDirectory(
			packageTemplatePath,
			renderedTemplates,
			false,
		);

		const outputPath = path.join(
			config.compilerOptions.paths.outDir,
			constants.emailRenderedOutput,
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
