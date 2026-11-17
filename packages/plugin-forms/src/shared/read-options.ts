import type { FormFieldOption, FormFieldSettings } from "../types.js";
import isRecord from "./is-record.js";

/** Reads a field's `options` setting, leaving out choices without a value. Labels default to the value. */
const readOptions = (settings: FormFieldSettings): FormFieldOption[] => {
	if (!Array.isArray(settings.options)) return [];

	return settings.options.flatMap((option: unknown) => {
		if (!isRecord(option)) return [];
		const { label, value } = option;
		if (typeof value !== "string" || value.trim() === "") return [];

		return [
			{
				label: typeof label === "string" && label.trim() ? label : value,
				value,
			},
		];
	});
};

export default readOptions;
