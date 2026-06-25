import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import deepMerge from "../../../../../utils/helpers/deep-merge.js";
import type { BooleanInt } from "../../../../db/types.js";
import formatter from "../../../../formatters/index.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { checkboxFieldConfig } from "./config.js";

class CheckboxCustomField extends CustomField<"checkbox"> {
	type = checkboxFieldConfig.type;
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
				label:
					this.props?.details?.label ??
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				true: this.props?.details?.true,
				false: this.props?.details?.false,
			},
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? false,
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"checkbox">;
	}
	get errors() {
		return deepMerge(super.errors, {
			required: {
				condition: (value: unknown) =>
					value === undefined || value === null || value === 0,
				message: copy("server:core.fields.checkbox.validation.required"),
			},
		});
	}
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
							this.config.default,
						),
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: BooleanInt | null) {
		return formatter.formatBoolean(
			Boolean(value) ?? this.config.default,
		) satisfies CFResponse<"checkbox">["value"];
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.union([z.literal(1), z.literal(0), z.boolean()]);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default CheckboxCustomField;
