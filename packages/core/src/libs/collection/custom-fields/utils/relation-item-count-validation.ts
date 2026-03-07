import T from "../../../../translations/index.js";
import type { CustomFieldValidateResponse } from "../types.js";

/**
 * Applies multi-value min/max item validation for relation fields while
 * leaving single-value fields unaffected.
 */
export const validateRelationItemCount = (props: {
	multiple?: boolean;
	length: number;
	validation?: {
		minItems?: number;
		maxItems?: number;
	};
}): CustomFieldValidateResponse => {
	if (props.multiple !== true) {
		return {
			valid: true,
		};
	}

	if (
		typeof props.validation?.minItems === "number" &&
		props.length < props.validation.minItems
	) {
		return {
			valid: false,
			message: T("field_relation_min_items", {
				min: props.validation.minItems,
			}),
		};
	}

	if (
		typeof props.validation?.maxItems === "number" &&
		props.length > props.validation.maxItems
	) {
		return {
			valid: false,
			message: T("field_relation_max_items", {
				max: props.validation.maxItems,
			}),
		};
	}

	return {
		valid: true,
	};
};
