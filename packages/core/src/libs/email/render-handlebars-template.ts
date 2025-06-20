import T from "../../translations/index.js";
import Handlebars from "handlebars";
import constants from "../../constants/constants.js";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { ServiceFn } from "../../utils/services/types.js";
import type { RenderedTemplates } from "./prerender-mjml-templates.js";

/**
 * Dynamically renders a handlebars template with the given data.
 */
const renderHandlebarsTemplate: ServiceFn<
	[
		{
			template: string;
			data: Record<string, unknown> | null;
		},
	],
	string
> = async (context, data) => {
	try {
		const templatesPath = path.resolve(
			process.cwd(),
			context.config.compilerOptions.outDir,
			constants.emailRenderedOutput,
		);
		const importUrl = pathToFileURL(templatesPath).href;

		const { default: renderedTemplates }: { default: RenderedTemplates } =
			await import(importUrl, {
				with: {
					type: "json",
				},
			});

		const templateData = renderedTemplates[data.template];
		if (!templateData) {
			return {
				error: {
					message: T("template_not_found_message"),
					status: 404,
				},
				data: undefined,
			};
		}

		const htmlTemplate = Handlebars.compile(templateData.html);
		const finalHtml = htmlTemplate(data.data);

		return {
			error: undefined,
			data: finalHtml,
		};
	} catch (error) {
		return {
			error: {
				message:
					error instanceof Error
						? error.message
						: T("template_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}
};

export default renderHandlebarsTemplate;
