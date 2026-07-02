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
import { colorFieldConfig } from "./config.js";

class ColorCustomField extends CustomField<"color"> {
	type = colorFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"color">) {
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
			presets: this.props?.presets ?? [],
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? "",
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"color">;
	}
	getSchemaDefinition(
		props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [
					{
						name: this.key,
						type: props.db.getDataType("text"),
						nullable: true,
						default: this.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: string | null) {
		return (value ??
			this.config.default ??
			null) satisfies CFResponse<"color">["value"];
	}
	override normalizeInputValue(value: unknown) {
		return typeof value === "string" ? value.trim() : value;
	}
	uniqueValidation(value: unknown) {
		// TODO: down the line, add validation for different color formats - currently accepts any value
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default ColorCustomField;
