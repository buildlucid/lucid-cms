import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { text } from "../../../../i18n/index.js";
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
import { richTextFieldConfig } from "./config.js";

class RichTextCustomField extends CustomField<"rich-text"> {
	type = richTextFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"rich-text">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label:
					this.props?.details?.label ??
					text.admin(`fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			ai: this.props?.ai,
			config: {
				localized: this.props?.config?.localized ?? true,
				default: this.props?.config?.default ?? {
					type: "doc",
					content: [{ type: "paragraph" }],
				},
				hidden: this.props?.config?.hidden,
				disabled: this.props?.config?.disabled,
				index: this.props?.config?.index,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"rich-text">;
	}
	protected override get supportsAi() {
		return true;
	}
	override get jsonSchema() {
		return {
			type: "object",
			additionalProperties: false,
			required: ["type", "content"],
			properties: {
				type: {
					const: "doc",
				},
				content: {
					type: "array",
					items: {
						$ref: "#/$defs/node",
					},
				},
			},
			$defs: {
				node: {
					type: "object",
					additionalProperties: true,
					required: ["type"],
					properties: {
						type: {
							type: "string",
						},
						attrs: {
							type: "object",
						},
						content: {
							type: "array",
							items: {
								$ref: "#/$defs/node",
							},
						},
						text: {
							type: "string",
						},
						marks: {
							type: "array",
							items: {
								type: "object",
								additionalProperties: true,
								required: ["type"],
								properties: {
									type: {
										type: "string",
									},
									attrs: {
										type: "object",
									},
								},
							},
						},
					},
				},
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
						name: this.key,
						type: props.db.getDataType("json"),
						nullable: true,
						default: this.config.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: Record<string, unknown> | null) {
		return (value ??
			this.config.config.default ??
			null) satisfies CFResponse<"rich-text">["value"];
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.record(
			z.union([z.string(), z.number(), z.symbol()]),
			z.unknown(),
		);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return { valid: true };
	}
}

export default RichTextCustomField;
