import T from "../../translations/index.js";
import type {
	CFConfig,
	FieldTypes,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	CustomFieldValidateResponse,
} from "./types.js";
import zodSafeParse from "./utils/zod-safe-parse.js";
import type {
	SchemaDefinition,
	GetSchemaDefinitionProps,
	FieldRefParams,
} from "./types.js";
import type { ServiceResponse } from "../../types.js";

abstract class CustomField<T extends FieldTypes> {
	repeater: string | null = null;

	abstract type: T;
	abstract key: string;
	abstract props?: CFProps<T>;
	abstract config: CFConfig<T>;

	abstract formatResponseValue(value: unknown): CFResponse<T>["value"];

	abstract cfSpecificValidation(
		value: unknown,
		relationData?: unknown,
	): {
		valid: boolean;
		message?: string;
	};
	abstract get translationsEnabled(): boolean;
	abstract get defaultValue(): unknown;

	/**
	 * Determins how the field should be defined in the database
	 *
	 * If the foreign key is referencing a Custom Field key, use the `prefixGeneratedColName(key)` helper on the column
	 */
	abstract getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>>;

	// Methods
	static formatRef(
		value: unknown,
		params: FieldRefParams,
	): CFResponse<FieldTypes>["ref"] | null {
		return null;
	}
	public validate(props: {
		type: FieldTypes;
		value: unknown;
		relationData?: unknown;
	}): CustomFieldValidateResponse {
		if (this.config.type === "tab") return { valid: true };

		// Check type
		const fieldTypeRes = this.fieldTypeValidation(props.type);
		if (fieldTypeRes.valid === false) return fieldTypeRes;

		// required
		const requiredRes = this.requiredCheck(props.value);
		if (!requiredRes.valid) return requiredRes;

		// zod
		const zodRes = this.zodCheck(props.value);
		if (!zodRes.valid) return zodRes;

		// nullish skip further validation
		if (props.value === null || props.value === undefined) {
			return { valid: true };
		}

		// custom field specific validation
		return this.cfSpecificValidation(props.value, props.relationData);
	}
	private fieldTypeValidation(type: FieldTypes) {
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
	private requiredCheck(value: unknown): CustomFieldValidateResponse {
		if (this.config.type === "tab") return { valid: true };
		if (this.config.type === "repeater") return { valid: true };

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
	private zodCheck(value: unknown): CustomFieldValidateResponse {
		if (this.config.type === "tab") return { valid: true };
		if (this.config.type === "repeater") return { valid: true };
		if (this.config.type === "media") return { valid: true };
		if (this.config.type === "checkbox") return { valid: true };
		if (this.config.type === "select") return { valid: true };
		if (this.config.type === "color") return { valid: true };
		if (this.config.type === "link") return { valid: true };
		if (this.config.type === "user") return { valid: true };
		if (this.config.type === "wysiwyg") return { valid: true };
		if (this.config.type === "document") return { valid: true };

		if (!this.config.validation?.zod) return { valid: true };

		return zodSafeParse(value, this.config.validation?.zod);
	}
	// Getters
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
