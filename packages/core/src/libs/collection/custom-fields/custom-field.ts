import type { ZodType } from "zod";
import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../types.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	CustomFieldValidateResponse,
	FieldTypes,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "./types.js";
import zodSafeParse from "./utils/zod-safe-parse.js";

type SharedValidationFlags = {
	skipValidation: boolean;
	skipRequiredValidation: boolean;
	skipZodValidation: boolean;
};

type FieldValidationShape = {
	required?: boolean;
	zod?: ZodType<unknown>;
};

const defaultSharedValidationFlags: SharedValidationFlags = {
	skipValidation: false,
	skipRequiredValidation: false,
	skipZodValidation: false,
};

const hasRuntimeConfig = (
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

const hasValidationConfig = (
	config: CFConfig<FieldTypes>,
): config is CFConfig<FieldTypes> & {
	validation?: FieldValidationShape;
} => {
	return (
		typeof config === "object" && config !== null && "validation" in config
	);
};

const hasZodValidation = (
	validation: unknown,
): validation is {
	zod?: ZodType<unknown>;
} => {
	return (
		typeof validation === "object" && validation !== null && "zod" in validation
	);
};

abstract class CustomField<T extends FieldTypes> {
	/** Repeater key when this field belongs to a repeater scope. */
	repeater: string | null = null;

	abstract type: T;
	abstract key: string;
	abstract props?: CFProps<T>;
	abstract config: CFConfig<T>;

	/** Formats raw DB values into API response values for this field. */
	abstract formatResponseValue(value: unknown): CFResponse<T>["value"];

	/** Runs field-specific validation once shared checks have passed. */
	abstract uniqueValidation(
		value: unknown,
		refData?: unknown,
	): {
		valid: boolean;
		message?: string;
	};
	/**
	 * Defines DB schema fragments for this field.
	 *
	 * If the foreign key references another custom field key, use
	 * `prefixGeneratedColName(key)` for the referenced column.
	 */
	abstract getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>>;

	/**
	 * Field-level switches for shared validation phases.
	 * Override in subclasses when a field should skip a shared phase.
	 */
	protected get sharedValidationFlags(): SharedValidationFlags {
		return defaultSharedValidationFlags;
	}

	/** Runs shared validation and then delegates to `uniqueValidation`. */
	public validate(props: {
		type: FieldTypes;
		value: unknown;
		refData?: unknown;
	}): CustomFieldValidateResponse {
		if (this.sharedValidationFlags.skipValidation) return { valid: true };

		const fieldTypeRes = this.validateFieldType(props.type);
		if (fieldTypeRes.valid === false) return fieldTypeRes;

		const requiredRes = this.validateRequired(props.value);
		if (!requiredRes.valid) return requiredRes;

		const zodRes = this.validateZodConstraint(props.value);
		if (!zodRes.valid) return zodRes;

		if (props.value === null || props.value === undefined) {
			return { valid: true };
		}

		return this.uniqueValidation(props.value, props.refData);
	}

	/** Validates that the submitted field type matches this instance type. */
	private validateFieldType(type: FieldTypes) {
		if (this.errors.fieldType.condition?.(type)) {
			return {
				valid: false,
				message: T("field_type_mismatch", {
					received: type,
					expected: this.config.type,
				}),
			};
		}
		return { valid: true };
	}

	/** Applies shared required checks where supported. */
	private validateRequired(value: unknown): CustomFieldValidateResponse {
		if (this.sharedValidationFlags.skipRequiredValidation) {
			return { valid: true };
		}
		if (!hasValidationConfig(this.config)) {
			return { valid: true };
		}

		if (
			this.config.validation?.required === true &&
			this.errors.required.condition?.(value)
		) {
			return {
				valid: false,
				message: this.errors.required.message,
			};
		}
		return { valid: true };
	}

	/** Applies optional zod checks when the field exposes a zod validator. */
	private validateZodConstraint(value: unknown): CustomFieldValidateResponse {
		if (this.sharedValidationFlags.skipZodValidation) {
			return { valid: true };
		}
		if (!hasValidationConfig(this.config)) {
			return { valid: true };
		}

		if (
			!hasZodValidation(this.config.validation) ||
			!this.config.validation.zod
		) {
			return { valid: true };
		}

		return zodSafeParse(value, this.config.validation.zod);
	}

	/** Normalizes input values before validation and persistence. */
	public normalizeInputValue(value: unknown): unknown {
		return value;
	}

	/** Whether this field should be processed with localization translations. */
	get translationsEnabled(): boolean {
		if (!hasRuntimeConfig(this.config)) return false;
		return this.config.config.useTranslations ?? false;
	}

	/** Default fallback value used while normalizing missing field input. */
	get defaultValue(): unknown {
		if (!hasRuntimeConfig(this.config)) return null;
		if (!Object.hasOwn(this.config.config, "default")) {
			return null;
		}

		return this.config.config.default;
	}

	/** Shared error builders used by `validate*` checks. */
	get errors(): {
		fieldType: CustomFieldErrorItem;
		required: CustomFieldErrorItem;
		zod: CustomFieldErrorItem;
	} {
		return {
			fieldType: {
				condition: (value: unknown) => value !== this.type,
				message: T("field_type_mismatch", {
					received: "unknown",
					expected: this.config.type,
				}),
			},
			required: {
				condition: (value: unknown) =>
					value === undefined || value === null || value === "",
				message: T("generic_field_required"),
			},
			zod: {
				message: T("generic_field_invalid"),
			},
		};
	}
}

export default CustomField;
