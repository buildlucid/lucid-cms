import { readFile } from "node:fs/promises";
import path from "node:path";
import Mustache from "mustache";
import constants from "../../../constants/constants.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { text } from "../../i18n/index.js";
import type { RenderedTemplates } from "../types.js";

/**
 * Dynamically renders a mustache template with the given data.
 */
const renderMustacheTemplate: ServiceFn<
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
		if (preRenderedTemplate === undefined) {
			return {
				error: {
					message: text.server("core.email.templates.not.found.message"),
					status: 404,
				},
				data: undefined,
			};
		}

		const renderedTemplate = Mustache.render(preRenderedTemplate, data.data);

		return {
			error: undefined,
			data: renderedTemplate,
		};
	}

	try {
		const templatesPath = path.resolve(
			process.cwd(),
			context.config.build.paths.outDir,
			constants.email.renderedOutput,
		);
		const renderedTemplates = JSON.parse(
			await readFile(templatesPath, "utf-8"),
		) as RenderedTemplates;

		const templateData = renderedTemplates[data.template];
		if (!templateData) {
			return {
				error: {
					message: text.server("core.email.templates.not.found.message"),
					status: 404,
				},
				data: undefined,
			};
		}

		const renderedTemplate = Mustache.render(templateData.html, data.data);

		return {
			error: undefined,
			data: renderedTemplate,
		};
	} catch (error) {
		return {
			error: {
				message: text.server(
					"core.email.templates.not.found.message",
					error instanceof Error
						? { defaultMessage: error.message }
						: undefined,
				),
				status: 404,
			},
			data: undefined,
		};
	}
};

export default renderMustacheTemplate;
