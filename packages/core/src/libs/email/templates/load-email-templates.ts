import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Config } from "../../../types.js";
import { getDirName } from "../../../utils/helpers/index.js";
import cliLogger from "../../cli/logger.js";
import type { RenderedTemplates } from "../types.js";

const currentDir = getDirName(import.meta.url);
const templateExtensions = new Set([".html", ".mustache"]);

const pathExists = async (targetPath: string): Promise<boolean> => {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
};

const getTemplateName = (file: string) => {
	const extension = path.extname(file);
	if (!templateExtensions.has(extension)) return null;

	return file.slice(0, -extension.length);
};

const processTemplatesInDirectory = async (
	directory: string,
	renderedTemplates: RenderedTemplates,
	overwrite = true,
	silent = false,
): Promise<void> => {
	if (!(await pathExists(directory))) return;

	const files = (await readdir(directory, { withFileTypes: true }))
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.toSorted();

	for (const file of files) {
		const templateName = getTemplateName(file);
		if (!templateName) continue;

		if (!overwrite && renderedTemplates[templateName]) {
			continue;
		}

		const filePath = path.join(directory, file);
		const [html, fileStat] = await Promise.all([
			readFile(filePath, "utf-8"),
			stat(filePath),
		]);

		renderedTemplates[templateName] = {
			html,
			lastModified: fileStat.mtime.toISOString(),
		};

		cliLogger.info("Prepared email template:", cliLogger.color.green(file), {
			silent,
		});
	}
};

const loadEmailTemplates = async (props: {
	config: Config;
	silent?: boolean;
}): Promise<RenderedTemplates> => {
	const silent = props.silent ?? false;
	const renderedTemplates: RenderedTemplates = {};

	const projectTemplatePath = props.config.email.templates.directory;
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

export default loadEmailTemplates;
