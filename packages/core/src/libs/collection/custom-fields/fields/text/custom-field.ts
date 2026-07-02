import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
import { defaultTextFieldAiGuidance } from "../../ai-guidance.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldAiFormatResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import { zodToJsonSchema } from "../../utils/helpers.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { textFieldConfig } from "./config.js";

class TextCustomField extends CustomField<"text"> {
	type = textFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"text">) {
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
			ai: this.props?.ai,
			localized: this.props?.localized ?? true,
			default: this.props?.default ?? "",
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"text">;
	}
	override get supportsAi() {
		return true;
	}
	protected override get defaultAiGuidance() {
		return defaultTextFieldAiGuidance;
	}
	override get jsonSchema() {
		return zodToJsonSchema(this.config.validation?.zod, {
			type: "string",
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
			null) satisfies CFResponse<"text">["value"];
	}
	override formatAiGeneratedValue(value: unknown): CustomFieldAiFormatResponse {
		return {
			success: true,
			value: typeof value === "string" ? value : String(value ?? ""),
		};
	}
	override normalizeInputValue(value: unknown) {
		return typeof value === "string" ? value.trim() : value;
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default TextCustomField;
