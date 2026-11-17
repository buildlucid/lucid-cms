import type { FormFieldRenderer } from "../../shared/render-form.js";
import type { FormFieldTypeDefinition } from "../../types.js";

/** The `render` of each field type that has one, by type key, for `renderForm`'s `fields`. */
const typeRenderers = (
	fieldTypes: Map<string, FormFieldTypeDefinition>,
): Record<string, FormFieldRenderer> =>
	Object.fromEntries(
		[...fieldTypes.values()].flatMap((type) =>
			type.render ? [[type.key, type.render]] : [],
		),
	);

export default typeRenderers;
