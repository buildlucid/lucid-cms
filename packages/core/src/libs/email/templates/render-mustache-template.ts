import Mustache from "mustache";
import type { ServiceFn } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";

/** Renders Mustache templates with data from `config.email.templates`, which runtimes populate from project email files. */
const renderMustacheTemplate: ServiceFn<
	[
		{
			template: string;
			data: Record<string, unknown> | null;
		},
	],
	string
> = async (context, data) => {
	const template = context.config.email.templates?.[data.template];
	if (template === undefined) {
		return {
			error: {
				message: copy("server:core.email.templates.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: Mustache.render(template, data.data),
	};
};

export default renderMustacheTemplate;
