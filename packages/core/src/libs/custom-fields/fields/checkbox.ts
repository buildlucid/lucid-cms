import T from "../../../translations/index.js";
import z from "zod/v4";
import CustomField from "../custom-field.js";
import merge from "lodash.merge";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import Formatter from "../../formatters/index.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	SchemaDefinition,
	GetSchemaDefinitionProps,
} from "../types.js";
import type { BooleanInt } from "../../db/types.js";
import type { ServiceResponse } from "../../../types.js";

class CheckboxCustomField extends CustomField<"checkbox"> {
	type = "checkbox" as const;
	column = "bool_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"checkbox">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
				true: this.props?.details?.true,
				false: this.props?.details?.false,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default ?? false,
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"checkbox">;
	}
	// Methods
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: this.key,
						type: props.db.getDataType("boolean"),
						nullable: true,
						default: props.db.formatInsertValue<BooleanInt>(
							"boolean",
							this.config.config.default,
						),
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: BooleanInt | null) {
		return Formatter.formatBoolean(
			Boolean(value) ?? this.config.config.default,
		) satisfies CFResponse<"checkbox">["value"];
	}
	formatResponseMeta() {
		return null satisfies CFResponse<"checkbox">["meta"];
	}
	cfSpecificValidation(value: unknown) {
		const valueSchema = z.union([z.literal(1), z.literal(0), z.boolean()]);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
	// Getters
	get errors() {
		return merge(super.errors, {
			required: {
				condition: (value: unknown) =>
					value === undefined || value === null || value === 0,
				message: T("checkbox_field_required"),
			},
		});
	}
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
	get defaultValue() {
		return this.config.config.default;
	}
}

export default CheckboxCustomField;
