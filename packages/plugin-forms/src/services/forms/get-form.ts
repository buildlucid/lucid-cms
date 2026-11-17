import type { ServiceFn } from "@lucidcms/core/types";
import type { FormReadInput, Form } from "../../types.js";
import type { FormsPluginOptionsInternal } from "../parse-plugin-options.js";
import getFormSettings from "./get-form-settings.js";
import toForm from "./to-form.js";

/** Finds a form by its key and keeps what a website may be given. Null when no form has the key. */
const getForm: ServiceFn<
	[{ options: FormsPluginOptionsInternal; input: FormReadInput }],
	Form | null
> = async (context, data) => {
	const form = await getFormSettings(context, data);
	if (form.error) return form;
	if (form.data === null) return { error: undefined, data: null };

	return toForm(context, {
		form: form.data,
		locale: data.input.locale,
		version: data.input.version,
	});
};

export default getForm;
