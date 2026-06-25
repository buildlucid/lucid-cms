import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
import prefixGeneratedColName from "../../../helpers/prefix-generated-column-name.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	CustomFieldValidationError,
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
import { userFieldConfig } from "./config.js";
import type { UserValidationData } from "./types.js";

class UserCustomField extends CustomField<"user"> {
	type = userFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"user">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label:
					this.props?.details?.label ??
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
			},
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? [],
			index: this.props?.index,
			multiple: this.props?.multiple,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"user">;
	}
	override normalizeInputValue(value: unknown) {
		return clampRelationInputValue(value, this.config.multiple);
	}
	override get defaultValue(): unknown {
		return normalizeStoredRelationValues(
			this.config.default,
			this.config.multiple,
		);
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
						name: "user_id",
						type: props.db.getDataType("integer"),
						nullable: false,
						foreignKey: {
							table: "lucid_users",
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
		) satisfies CFResponse<"user">["value"];
	}
	override get relationValueColumn() {
		return "user_id";
	}
	override serializeRelationFieldValue(
		value: unknown,
	): Array<Record<string, unknown>> {
		return normalizeStoredRelationValues(value, this.config.multiple).map(
			(userId) => ({
				[prefixGeneratedColName("user_id")]: userId,
			}),
		);
	}
	uniqueValidation(value: unknown, refData?: UserValidationData[]) {
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
		for (const [itemIndex, userId] of normalizedValue.entries()) {
			const findUser = refData?.find((u) => u.id === userId);

			if (findUser === undefined) {
				errors.push({
					itemIndex,
					message: copy("server:core.fields.user.validation.not.found"),
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

export default UserCustomField;
