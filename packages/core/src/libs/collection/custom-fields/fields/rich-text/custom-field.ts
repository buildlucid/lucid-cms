import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import {
	getObject,
	richTextHasContent,
} from "../../../../../utils/helpers/index.js";
import { copy } from "../../../../i18n/index.js";
import { defaultTextFieldAiGuidance } from "../../ai-guidance.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	CustomFieldAiFormatResponse,
	CustomFieldErrorItem,
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
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			ai: this.props?.ai,
			localized: this.props?.localized ?? true,
			default: this.props?.default ?? {
				type: "doc",
				content: [{ type: "paragraph" }],
			},
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"rich-text">;
	}
	override get supportsAi() {
		return true;
	}
	protected override get defaultAiGuidance() {
		return defaultTextFieldAiGuidance;
	}
	override get errors(): {
		fieldType: CustomFieldErrorItem;
		required: CustomFieldErrorItem;
		zod: CustomFieldErrorItem;
	} {
		const errors = super.errors;

		return {
			...errors,
			required: {
				condition: (value: unknown) =>
					errors.required.condition?.(value) === true ||
					(getObject(value) !== null && !richTextHasContent(value)),
				message: errors.required.message,
			},
		};
	}
	override get jsonSchema() {
		const textNodeSchema = {
			type: "object",
			additionalProperties: false,
			required: ["type", "text"],
			properties: {
				type: {
					type: "string",
					const: "text",
				},
				text: {
					type: "string",
				},
			},
		};
		const paragraphNodeSchema = {
			type: "object",
			additionalProperties: false,
			required: ["type", "content"],
			properties: {
				type: {
					type: "string",
					const: "paragraph",
				},
				content: {
					type: "array",
					items: textNodeSchema,
				},
			},
		};

		return {
			type: "object",
			additionalProperties: false,
			required: ["type", "content"],
			properties: {
				type: {
					type: "string",
					const: "doc",
				},
				content: {
					type: "array",
					items: paragraphNodeSchema,
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
						default: this.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: Record<string, unknown> | null) {
		return (value ??
			this.config.default ??
			null) satisfies CFResponse<"rich-text">["value"];
	}
	override formatAiGeneratedValue(value: unknown): CustomFieldAiFormatResponse {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return {
				success: true,
				value,
			};
		}

		return {
			success: false,
			message: copy("server:core.routes.ai.generate.error.message"),
		};
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
