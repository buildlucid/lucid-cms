import path from "node:path";
import { pathToFileURL } from "node:url";
import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RenderedTemplates } from "../types.js";
import replaceTemplateVariables from "./replace-template-vars.js";

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
	//* use pre-rendered templates if available
	if (context.config.preRenderedEmailTemplates) {
		const preRenderedTemplate =
			context.config.preRenderedEmailTemplates[data.template];
		if (preRenderedTemplate) {
			return {
				error: undefined,
				data: replaceTemplateVariables(preRenderedTemplate, data.data),
			};
		}
	}

	try {
		const templatesPath = path.resolve(
			process.cwd(),
			context.config.compilerOptions.paths.outDir,
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

		return {
			error: undefined,
			data: replaceTemplateVariables(templateData.html, data.data),
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
