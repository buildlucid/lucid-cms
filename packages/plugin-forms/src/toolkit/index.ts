import { defineToolkit, runToolkitService } from "@lucidcms/core/toolkit";
import type { ToolkitContext } from "@lucidcms/core/types";
import { formReadInputSchema, formSubmitInputSchema } from "../schema/forms.js";
import getForm from "../services/forms/get-form.js";
import typeRenderers from "../services/forms/type-renderers.js";
import type { FormsPluginOptionsInternal } from "../services/parse-plugin-options.js";
import submitForm from "../services/submissions/submit-form.js";
import renderForm, { type RenderFormOptions } from "../shared/render-form.js";
import type { FormReadInput, FormSubmitInput } from "../types.js";

const createFormsToolkit = (
	context: ToolkitContext,
	options: FormsPluginOptionsInternal,
) => ({
	/**
	 * Reads a form by its key, as websites draw and send it: its fields, where it posts and what a
	 * captcha widget needs, in the locale and environment asked for. Leaves out recipients and
	 * other settings, so it is safe to send to a browser. Returns null when no form has the key.
	 *
	 * @example
	 * ```ts
	 * const form = await toolkit.forms.get({ key: "contact", locale: "fr" });
	 * ```
	 */
	get: (input: FormReadInput) =>
		runToolkitService({
			schema: formReadInputSchema,
			input,
			handler: (read) => getForm(context, { options, input: read }),
			name: { key: "plugin.forms.toolkit.error.name" },
			message: { key: "plugin.forms.toolkit.get.error.message" },
		}),
	/**
	 * Draws a form by its key as `renderForm` does, with the `render` of field types that have one.
	 * Returns null when no form has the key.
	 *
	 * @example
	 * ```ts
	 * const html = await toolkit.forms.render({ key: "contact", locale: "fr" });
	 * ```
	 */
	render: (input: FormReadInput, render: RenderFormOptions = {}) =>
		runToolkitService({
			schema: formReadInputSchema,
			input,
			handler: async (read) => {
				const form = await getForm(context, { options, input: read });
				if (form.error) return form;
				if (form.data === null) return { error: undefined, data: null };

				return {
					error: undefined,
					data: renderForm(form.data, {
						...render,
						fields: { ...typeRenderers(options.fieldTypes), ...render.fields },
					}),
				};
			},
			name: { key: "plugin.forms.toolkit.error.name" },
			message: { key: "plugin.forms.toolkit.get.error.message" },
		}),
	/**
	 * Sends a form as its route does: the honeypot, validation and captcha, then files, emails,
	 * the stored submission and the notification. Refused answers come back in `error.errors.values`,
	 * keyed by field name. The route's rate limit doesn't apply here, so limit your own endpoint.
	 *
	 * @example
	 * ```ts
	 * const sent = await toolkit.forms.submit({
	 * 	key: "contact",
	 * 	values: { name: "Ada", email: "ada@example.com", message: "Hello" },
	 * });
	 * if (sent.error) return sent.error.errors?.values;
	 * ```
	 */
	submit: (input: FormSubmitInput) =>
		runToolkitService({
			schema: formSubmitInputSchema,
			input,
			handler: (submission) =>
				submitForm(context, { options, input: submission }),
			name: { key: "plugin.forms.toolkit.error.name" },
			message: { key: "plugin.forms.toolkit.submit.error.message" },
		}),
});

/** Forms helpers available on `toolkit.forms` when the forms plugin is configured. */
export type FormsToolkit = ReturnType<typeof createFormsToolkit>;

declare module "@lucidcms/core/types" {
	interface ToolkitServices {
		forms: FormsToolkit;
	}
}

/** Adds `toolkit.forms`, bound to these plugin options. */
const formsToolkit = (options: FormsPluginOptionsInternal) =>
	defineToolkit({
		key: "forms",
		create: ({ context }) => createFormsToolkit(context, options),
	});

export { createFormsToolkit };
export default formsToolkit;
