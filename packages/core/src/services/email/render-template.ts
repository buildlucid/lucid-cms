import T from "../../translations/index.js";
import { readFile, access } from "node:fs/promises";
import Handlebars from "handlebars";
import mjml2html from "mjml";
import path from "node:path";
import { getDirName } from "../../utils/helpers/index.js";
import type { Config } from "../../types/config.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";

const currentDir = getDirName(import.meta.url);

const pathExists = async (path: string): Promise<boolean> => {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
};

const getTemplateData = async (
	config: Config,
	template: string,
): ServiceResponse<string> => {
	try {
		// if user given template exists, return the file
		const projectTemplatePath = config.paths?.emailTemplates
			? `${config.paths?.emailTemplates}/${template}.mjml`
			: path.resolve("./templates", `${template}.mjml`);

		if (await pathExists(projectTemplatePath)) {
			return {
				error: undefined,
				data: await readFile(projectTemplatePath, "utf-8"),
			};
		}

		// fallback to default template
		const packageTemplatePath = path.join(
			currentDir,
			`../templates/${template}.mjml`,
		);
		if (await pathExists(packageTemplatePath)) {
			return {
				error: undefined,
				data: await readFile(packageTemplatePath, "utf-8"),
			};
		}

		return {
			error: {
				message: T("template_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	} catch (error) {
		if (error instanceof Error) {
			return {
				error: {
					message: error.message || T("template_not_found_message"),
					status: 404,
				},
				data: undefined,
			};
		}

		return {
			error: {
				message: T("template_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}
};

const renderTemplate: ServiceFn<
	[
		{
			template: string;
			data: Record<string, unknown> | null;
		},
	],
	string
> = async (context, data) => {
	const mjmlFile = await getTemplateData(context.config, data.template);
	if (mjmlFile.error) return mjmlFile;

	const mjmlTemplate = Handlebars.compile(mjmlFile.data);
	const mjml = mjmlTemplate(data.data);
	const htmlOutput = await mjml2html(mjml); //* lib types are wrong - this returns a promise. We are using a alpha version however

	return {
		error: undefined,
		data: htmlOutput.html,
	};
};

export default renderTemplate;
