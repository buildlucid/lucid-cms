import type { FieldError } from "@types";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";

/**
 * Structural containers (tabs, sections, collapsibles) are transparent for
 * field data - their fields belong to the containing level, both in config
 * and in the submitted field data.
 */
export const flattenStructuralScopeConfigs = (
	configs: CollectionFieldConfig[],
): CollectionDataFieldConfig[] => {
	return configs.flatMap((config) =>
		config.type === "tab" ||
		config.type === "section" ||
		config.type === "collapsible"
			? flattenStructuralScopeConfigs(config.fields)
			: [config],
	);
};

/**
 * Collects every data-field key nested below a structural container. Repeater
 * keys are included because their validation error owns any nested group errors.
 */
export const getStructuralFieldKeys = (
	configs: CollectionFieldConfig[],
): Set<string> => {
	const keys = new Set<string>();

	const collect = (fields: CollectionFieldConfig[]) => {
		for (const field of fields) {
			keys.add(field.key);

			if (
				field.type === "tab" ||
				field.type === "repeater" ||
				field.type === "section" ||
				field.type === "collapsible"
			) {
				collect(field.fields);
			}
		}
	};

	collect(configs);
	return keys;
};

const countFieldError = (fieldError: FieldError): number => {
	let count = 1;

	for (const groupError of fieldError.groupErrors ?? []) {
		count += countFieldErrors(groupError.fields);
	}

	return count;
};

/** Counts direct validation messages and any messages nested in repeater groups. */
export const countFieldErrors = (fieldErrors: FieldError[]): number => {
	let count = 0;

	for (const fieldError of fieldErrors) {
		count += countFieldError(fieldError);
	}

	return count;
};

/** Counts errors whose top-level field key belongs to a precomputed key set. */
export const countFieldErrorsForKeys = (
	fieldErrors: FieldError[],
	fieldKeys: ReadonlySet<string>,
): number => {
	let count = 0;

	for (const fieldError of fieldErrors) {
		if (fieldKeys.has(fieldError.key)) {
			count += countFieldError(fieldError);
		}
	}

	return count;
};

/** Counts validation errors belonging to a structural container's descendants. */
export const countStructuralFieldErrors = (
	configs: CollectionFieldConfig[],
	fieldErrors: FieldError[],
): number => {
	return countFieldErrorsForKeys(fieldErrors, getStructuralFieldKeys(configs));
};
