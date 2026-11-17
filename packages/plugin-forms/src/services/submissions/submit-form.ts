import { copy, serviceWrapper } from "@lucidcms/core";
import { createToolkit } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import { spam } from "../../constants.js";
import hookEvents from "../../hook-events/index.js";
import type { FormSubmitInput, FormSubmitResult } from "../../types.js";
import getFormSettings from "../forms/get-form-settings.js";
import type { FormsPluginOptionsInternal } from "../parse-plugin-options.js";
import isEmpty from "./is-empty.js";
import storeSubmission from "./store-submission.js";
import validateFiles from "./validate-files.js";
import validateValues from "./validate-values.js";

/**
 * Checks honeypot, values and then single-use captcha tokens before `beforeSubmit` and storage.
 * Returns success for honeypot submissions without storing them.
 */
const submitForm: ServiceFn<
	[{ options: FormsPluginOptionsInternal; input: FormSubmitInput }],
	FormSubmitResult
> = async (context, data) => {
	const { options, input } = data;

	const formRes = await getFormSettings(context, {
		options,
		input: { key: input.key, locale: input.locale, version: input.version },
	});
	if (formRes.error) return formRes;
	if (formRes.data === null) {
		return {
			error: {
				type: "basic",
				status: 404,
				code: "not_found",
				name: copy("server:plugin.forms.not.found.name"),
				message: copy("server:plugin.forms.not.found"),
			},
			data: undefined,
		};
	}
	const form = formRes.data;

	if (form.honeypot && !isEmpty(input.values[spam.honeypot])) {
		return {
			error: undefined,
			data: { confirmation: form.confirmation, submissionId: null },
		};
	}

	const checked = validateValues(form, options.fieldTypes, input.values);
	const files = validateFiles(
		form,
		input.files ?? {},
		context.config.media.limits.uploadBytes,
	);
	const fieldErrors = { ...checked.errors, ...files.errors };
	if (Object.keys(fieldErrors).length > 0) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: copy("server:plugin.forms.submit.invalid"),
				errors: {
					values: Object.fromEntries(
						Object.entries(fieldErrors).map(([name, error]) => [
							name,
							{ code: error.code, message: copy.literal(error.message) },
						]),
					),
				},
			},
			data: undefined,
		};
	}

	if (form.captcha && context.captcha !== null) {
		const verified = await createToolkit(context).captcha.verify({
			token: input.captchaToken,
			action: spam.captchaAction,
		});
		if (verified.error) return verified;
	}

	const before = await hookEvents.execute(context, "beforeSubmit", {
		meta: { form },
		data: { values: checked.values },
	});
	if (before.error) return before;

	//* isolated, so a failure undoes all of it even inside a transaction the caller goes on to commit
	return serviceWrapper(storeSubmission, {
		transaction: true,
		isolate: true,
	})(context, {
		form,
		values: before.data.values,
		accepted: files.accepted,
	});
};

export default submitForm;
