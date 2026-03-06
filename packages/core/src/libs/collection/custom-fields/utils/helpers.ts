import type { ZodType } from "zod";
import type { CFConfig, FieldTypes } from "../types.js";

/**
 * Checks if the custom field config property has a runtime config object.
 */
export const hasRuntimeConfig = (
	config: CFConfig<FieldTypes>,
): config is CFConfig<FieldTypes> & {
	config: {
		useTranslations?: boolean;
		default?: unknown;
	};
} => {
	return (
		typeof config === "object" &&
		config !== null &&
		"config" in config &&
		typeof config.config === "object" &&
		config.config !== null
	);
};

/**
 * Checks if the custom field config property has a validation config object.
 */
export const hasValidationConfig = (
	config: CFConfig<FieldTypes>,
): config is CFConfig<FieldTypes> & {
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
} => {
	return (
		typeof config === "object" && config !== null && "validation" in config
	);
};

/**
 * Checks if the validation config object has a zod validation object.
 */
export const hasZodValidation = (
	validation: unknown,
): validation is {
	zod?: ZodType<unknown>;
} => {
	return (
		typeof validation === "object" && validation !== null && "zod" in validation
	);
};
