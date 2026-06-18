import { normalizeCopy } from "../../../i18n/index.js";
import type { AdminCopyInput } from "../../../i18n/types.js";
import type { CFConfig, FieldTypes } from "../types.js";

/** Copy-bearing keys that may appear on a field config's `details` object. */
const detailCopyKeys = ["label", "summary", "placeholder", "true", "false"];

/**
 * Normalises author-supplied copy on a field config in place.
 *
 * Plain strings authored against `details` (label/summary/placeholder, checkbox
 * `true`/`false`) and select `options[].label` become literal copy so the
 * runtime config only ever holds descriptor/literal objects. Keys that are not
 * present are left untouched so the config shape is preserved.
 */
const normalizeFieldCopy = (config: CFConfig<FieldTypes>): void => {
	const details = (config as { details?: Record<string, AdminCopyInput> })
		.details;
	if (details) {
		for (const key of detailCopyKeys) {
			if (!Object.hasOwn(details, key)) continue;
			details[key] = normalizeCopy(details[key]) as AdminCopyInput;
		}
	}

	const options = (config as { options?: Array<{ label?: AdminCopyInput }> })
		.options;
	if (Array.isArray(options)) {
		for (const option of options) {
			if (!Object.hasOwn(option, "label")) continue;
			option.label = normalizeCopy(option.label) as AdminCopyInput;
		}
	}
};

export default normalizeFieldCopy;
