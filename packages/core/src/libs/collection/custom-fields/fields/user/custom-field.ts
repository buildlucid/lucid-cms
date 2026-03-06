import z from "zod";
import T from "../../../../../translations/index.js";
import type { ServiceResponse } from "../../../../../types.js";
import prefixGeneratedColName from "../../../helpers/prefix-generated-column-name.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldErrorItem,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import {
	clampRelationInputValue,
	normalizeStoredRelationValues,
} from "../../utils/normalize-relation-values.js";
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
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default ?? [],
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
				multiple: this.props?.config?.multiple,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"user">;
	}
	override normalizeInputValue(value: unknown) {
		return clampRelationInputValue(value, this.config.config.multiple);
	}
	override get defaultValue(): unknown {
		return normalizeStoredRelationValues(
			this.config.config.default,
			this.config.config.multiple,
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
				message: T("generic_field_required"),
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
			this.config.config.multiple,
		) satisfies CFResponse<"user">["value"];
	}
	override get relationValueColumn() {
		return "user_id";
	}
	override serializeRelationFieldValue(
		value: unknown,
	): Array<Record<string, unknown>> {
		return normalizeStoredRelationValues(
			value,
			this.config.config.multiple,
		).map((userId) => ({
			[prefixGeneratedColName("user_id")]: userId,
		}));
	}
	uniqueValidation(value: unknown, refData?: UserValidationData[]) {
		const valueSchema = z.array(z.number());
		const candidateValue = clampRelationInputValue(
			value,
			this.config.config.multiple,
		);
		const valueValidate = zodSafeParse(candidateValue, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const normalizedValue = Array.isArray(candidateValue)
			? candidateValue.filter(
					(item): item is number => typeof item === "number",
				)
			: [];

		for (const userId of normalizedValue) {
			const findUser = refData?.find((u) => u.id === userId);

			if (findUser === undefined) {
				return {
					valid: false,
					message: T("field_user_not_found"),
				};
			}
		}

		return { valid: true };
	}
}

export default UserCustomField;
