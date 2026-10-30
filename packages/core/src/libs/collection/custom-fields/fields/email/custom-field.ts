import z from "zod";
import type { ServiceResponse } from "../../../../../exports/types.js";
import { copy } from "../../../../i18n/index.js";
import prefixGeneratedColName from "../../../helpers/prefix-generated-column-name.js";
import CustomField from "../../custom-field.js";
import type {
	CustomFieldContentFormatContext,
	CustomFieldErrorItem,
	CustomFieldValidationError,
	FieldConfig,
	FieldOptions,
	FieldResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import {
	clampRelationInputValue,
	normalizeStoredRelationValues,
} from "../../utils/normalize-relation-values.js";
import { validateRelationItemCount } from "../../utils/relation-item-count-validation.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { emailFieldConfig } from "./config.js";
import type { EmailValidationData } from "./types.js";

class EmailCustomField extends CustomField<"email"> {
	type = emailFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: FieldOptions<"email">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			resource: emailFieldConfig.resource,
			details: {
				label:
					this.props?.details?.label ??
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				description: this.props?.details?.description,
			},
			localized: this.props?.localized ?? false,
			index: this.props?.index,
			multiple: this.props?.multiple,
			allowInternal: this.props?.allowInternal ?? false,
			permissions: this.props?.permissions,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
			ai: this.props?.ai,
		} satisfies FieldConfig<"email">;
	}
	override normalizeInputValue(value: unknown) {
		return clampRelationInputValue(value, this.config.multiple);
	}
	override get defaultValue(): unknown {
		return [];
	}
	override get errors(): {
		fieldType: CustomFieldErrorItem;
		required: CustomFieldErrorItem;
		zod: CustomFieldErrorItem;
	} {
		return {
			...super.errors,
			required: {
				condition: (value: unknown) =>
					value === undefined ||
					value === null ||
					(Array.isArray(value) && value.length === 0),
				message: copy("server:core.fields.validation.required"),
			},
		};
	}
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: "email_id",
						type: props.db.getDataType("integer"),
						nullable: false,
						foreignKey: {
							table: "lucid_emails",
							column: "id",
							onDelete: "cascade",
						},
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value: unknown) {
		return normalizeStoredRelationValues(
			value,
			this.config.multiple,
		) satisfies FieldResponse<"email">["value"];
	}
	/** Gives content API reads the emails the IDs point to, leaving out any the read can't reach. */
	override formatContentValue(
		value: unknown,
		context: CustomFieldContentFormatContext,
	) {
		return Array.isArray(value)
			? value.flatMap((id) => context.email(id) ?? [])
			: value;
	}
	override get relationValueColumn() {
		return "email_id";
	}
	override serializeRelationFieldValue(
		value: unknown,
	): Array<Record<string, unknown>> {
		return normalizeStoredRelationValues(value, this.config.multiple).map(
			(emailId) => ({
				[prefixGeneratedColName("email_id")]: emailId,
			}),
		);
	}
	uniqueValidation(value: unknown, refData?: EmailValidationData[]) {
		const valueSchema = z.array(z.number());
		const candidateValue = clampRelationInputValue(value, this.config.multiple);
		const valueValidate = zodSafeParse(candidateValue, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const normalizedValue = Array.isArray(candidateValue)
			? candidateValue.filter(
					(item): item is number => typeof item === "number",
				)
			: [];
		const itemCountValidation = validateRelationItemCount({
			multiple: this.config.multiple,
			length: normalizedValue.length,
			validation: this.config.validation,
		});
		if (!itemCountValidation.valid) return itemCountValidation;

		const errors: CustomFieldValidationError[] = [];
		for (const [itemIndex, emailId] of normalizedValue.entries()) {
			const findEmail = refData?.find(
				(email) =>
					email.id === emailId &&
					(email.type === "external" || this.config.allowInternal === true),
			);

			if (findEmail === undefined) {
				errors.push({
					itemIndex,
					message: copy("server:core.fields.email.validation.not.found"),
				});
			}
		}

		if (errors.length > 0) {
			return {
				valid: false,
				errors,
			};
		}

		return { valid: true };
	}
}

export default EmailCustomField;
