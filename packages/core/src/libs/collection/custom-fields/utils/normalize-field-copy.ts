import { normalizeCopy } from "../../../i18n/index.js";
import type { AdminCopyInput } from "../../../i18n/types.js";
import type { FieldConfig, FieldTypes } from "../types.js";

/** Copy-bearing keys that may appear on a field config's `details` object. */
const detailCopyKeys = ["label", "description", "placeholder", "true", "false"];

/** Normalises existing field detail and select option copy in place, converting plain strings to literals while preserving absent keys. */
const normalizeFieldCopy = (config: FieldConfig<FieldTypes>): void => {
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
