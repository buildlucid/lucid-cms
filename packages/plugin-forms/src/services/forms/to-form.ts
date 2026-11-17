import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import { routes, spam } from "../../constants.js";
import type { FormSettings, Form } from "../../types.js";

/**
 * Keeps the parts of a form a website needs to draw and send it, leaving out recipients and what
 * happens to submissions, and adds where to post and what a captcha widget needs.
 */
const toForm: ServiceFn<
	[{ form: FormSettings; locale?: string; version?: string }],
	Form
> = async (context, data) => {
	const { form } = data;
	const action = new URL(
		`${routes.contentPrefix}${routes.content}/${form.key}/submit`,
		context.config.url,
	);
	//* sent with the same locale it was read in, so its message, emails and stored labels match what the visitor saw
	if (data.locale !== undefined) action.searchParams.set("locale", data.locale);
	//* and from the same environment, which its submission records
	if (data.version !== undefined && form.source === "collection") {
		action.searchParams.set("version", data.version);
	}
	let captcha: Form["captcha"] = null;

	if (form.captcha) {
		const widget = await createToolkit(context).captcha.renderWidget({
			action: spam.captchaAction,
			field: spam.captchaField,
		});
		if (widget.error) return widget;
		if (widget.data !== null && context.captcha) {
			captcha = {
				adapter: context.captcha.key,
				client: context.captcha.client ?? {},
				action: spam.captchaAction,
				field: spam.captchaField,
				widget: widget.data,
			};
		}
	}

	return {
		error: undefined,
		data: {
			key: form.key,
			name: form.name,
			fields: form.fields,
			submitLabel: form.submitLabel,
			confirmation: form.confirmation,
			action: action.toString(),
			honeypot: form.honeypot ? spam.honeypot : null,
			captcha,
		},
	};
};

export default toForm;
