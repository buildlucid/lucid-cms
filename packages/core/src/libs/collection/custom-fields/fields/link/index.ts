import isPlainObject from "../../../../../utils/helpers/is-plain-object.js";
import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import type { FieldTranslation } from "../../types.js";
import { linkFieldConfig } from "./config.js";
import LinkCustomField from "./custom-field.js";

export default {
	config: linkFieldConfig,
	class: LinkCustomField,
	validateInput: null,
	contentTypeGen: createValueFieldTypeGenerator(
		"{ url: string | null; target: string | null; label: string | null; } | null",
	),
	//* only the label is text; a translation with its own URL keeps it and its target, even an empty one, and others take the source's
	translation: {
		read: (value) =>
			isPlainObject(value) &&
			typeof value.label === "string" &&
			value.label.trim() !== ""
				? { format: "text", text: value.label }
				: null,
		write: (text, values) => {
			const source = isPlainObject(values.source) ? values.source : {};
			const current = isPlainObject(values.current) ? values.current : {};
			const link =
				typeof current.url === "string" && current.url !== ""
					? current
					: source;
			return {
				...source,
				url: link.url ?? null,
				target: link.target ?? null,
				label: text,
			};
		},
	} satisfies FieldTranslation,
};
