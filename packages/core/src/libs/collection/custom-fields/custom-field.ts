import T from "../../../translations/index.js";
import type {
	LucidBricksTable,
	Select,
	ServiceResponse,
} from "../../../types.js";
import prefixGeneratedColName from "../helpers/prefix-generated-column-name.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	CustomFieldValidateResponse,
	FieldRelationRefTarget,
	FieldRelationValidationInput,
	FieldTypes,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "./types.js";
import {
	hasRuntimeConfig,
	hasValidationConfig,
	hasZodValidation,
} from "./utils/helpers.js";
import { normalizeRelationValues } from "./utils/normalize-relation-values.js";
import zodSafeParse from "./utils/zod-safe-parse.js";

abstract class CustomField<T extends FieldTypes> {
	/** Tree-table parent key when this field belongs to a nested tree scope. */
	treeParent: string | null = null;

	abstract type: T;
	abstract key: string;
	abstract props?: CFProps<T>;
	abstract config: CFConfig<T>;

	/**
	 * Field-level switches for shared validation phases.
	 * Override in subclasses when a field should skip a shared phase.
	 */
	protected get sharedValidationFlags() {
		return {
			skipValidation: false,
			skipRequiredValidation: false,
			skipZodValidation: false,
		};
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
	/**
	 * Defines DB schema fragments for this field.
	 *
	 * If the foreign key references another custom field key, use
	 * `prefixGeneratedColName(key)` for the referenced column.
	 */
	abstract getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>>;
	/** Formats raw DB values into API response values for this field. */
	abstract formatResponseValue(value: unknown): CFResponse<T>["value"];
	/** Serializes field values into relation-table row payloads when needed. */
	public serializeRelationFieldValue(
		_value: unknown,
	): Array<Record<string, unknown>> {
		return [];
	}
	/**
	 * Returns the unprefixed column name that stores this field's relation ID value
	 * inside a relation-table row.
	 */
	get relationValueColumn(): string | null {
		return null;
	}
	/**
	 * Extracts a single field value item from a relation-table row.
	 */
	public extractRelationFieldValue(
		row: Select<LucidBricksTable>,
	): unknown | null {
		const relationValueColumn = this.relationValueColumn;
		if (!relationValueColumn) return null;

		const columnName = prefixGeneratedColName(relationValueColumn);
		return row[columnName] ?? null;
	}
	/**
	 * Returns relation field values grouped for shared validation fetches.
	 */
	public getRelationFieldValidationInput(
		value: unknown,
	): FieldRelationValidationInput {
		return {
			default: normalizeRelationValues(this.normalizeInputValue(value)),
		};
	}
	/**
	 * Returns any relation field ref targets that cannot be derived from schema
	 * foreign keys.
	 */
	public getRelationFieldRefTargets(
		_row: Select<LucidBricksTable>,
	): FieldRelationRefTarget[] {
		return [];
	}
	/** Runs field-specific validation once shared checks have passed. */
	abstract uniqueValidation(
		value: unknown,
		refData?: unknown,
	): {
		valid: boolean;
		message?: string;
	};
	/** Runs shared validation and then delegates to `uniqueValidation`. */
	public validate(props: {
		type: FieldTypes;
		value: unknown;
		refData?: unknown;
	}): CustomFieldValidateResponse {
		if (this.sharedValidationFlags.skipValidation) return { valid: true };

		const fieldTypeRes = this.validateFieldType(props.type);
		if (fieldTypeRes.valid === false) return fieldTypeRes;

		const normalizedValue = this.normalizeInputValue(props.value);

		const requiredRes = this.validateRequired(normalizedValue);
		if (!requiredRes.valid) return requiredRes;

		if (
			normalizedValue === null ||
			normalizedValue === undefined ||
			normalizedValue === ""
		) {
			return { valid: true };
		}

		const zodRes = this.validateZodConstraint(normalizedValue);
		if (!zodRes.valid) return zodRes;

		return this.uniqueValidation(normalizedValue, props.refData);
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
		)
			return { valid: true };

		return zodSafeParse(value, this.config.validation.zod);
	}
}

export default CustomField;
