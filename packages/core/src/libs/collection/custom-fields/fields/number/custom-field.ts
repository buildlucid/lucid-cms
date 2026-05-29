import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
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
import { numberFieldConfig } from "./config.js";

class NumberCustomField extends CustomField<"number"> {
	type = numberFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"number">) {
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
				placeholder: this.props?.details?.placeholder,
			},
			config: {
				localized: this.props?.config?.localized ?? false,
				default: this.props?.config?.default,
				hidden: this.props?.config?.hidden,
				disabled: this.props?.config?.disabled,
				index: this.props?.config?.index,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"number">;
	}
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: this.key,
						type: props.db.getDataType("integer"),
						nullable: true,
						default: this.config.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: number | null) {
		return (value ??
			this.config.config.default ??
			null) satisfies CFResponse<"number">["value"];
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.number();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default NumberCustomField;
