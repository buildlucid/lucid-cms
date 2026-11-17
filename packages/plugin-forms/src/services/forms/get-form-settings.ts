import type { ServiceFn } from "@lucidcms/core/types";
import type { FormSettings, FormReadInput } from "../../types.js";
import type { FormsPluginOptionsInternal } from "../parse-plugin-options.js";
import readCollectionForm from "./read-collection-form.js";

/**
 * Whatever a form says, nothing is stored and nobody is notified without the submissions
 * collection, whose readers the notification goes to. A form that doesn't store takes no files,
 * as files are kept as media that belongs to the stored submission.
 */
const applyStorage = (form: FormSettings, stores: boolean): FormSettings => {
	const store = form.store && stores;
	return {
		...form,
		store,
		notify: form.notify && stores,
		fields: store
			? form.fields
			: form.fields.filter((field) => field.control !== "file"),
	};
};

/**
 * Finds a form's settings by its key: one defined in code, or else one editors built. Holds email
 * recipients and storage settings, so it stays on the server. Null when neither has the key.
 */
const getFormSettings: ServiceFn<
	[{ options: FormsPluginOptionsInternal; input: FormReadInput }],
	FormSettings | null
> = async (context, data) => {
	const { options, input } = data;
	const stores = options.submissions !== false;

	const defined = options.readCodeForm(input.key, {
		current: input.locale,
		default: context.config.localization.defaultLocale ?? undefined,
	});
	if (defined) {
		return { error: undefined, data: applyStorage(defined, stores) };
	}
	if (options.builder === false) return { error: undefined, data: null };

	const built = await readCollectionForm(context, {
		options,
		builder: options.builder,
		key: input.key,
		locale: input.locale,
		version: input.version,
	});
	if (built.error) return built;
	if (built.data === null) return built;

	return { error: undefined, data: applyStorage(built.data, stores) };
};

export default getFormSettings;
