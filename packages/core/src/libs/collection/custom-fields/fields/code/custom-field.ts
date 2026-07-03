import z from "zod";
import constants from "../../../../../constants/constants.js";
import type { ServiceResponse } from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
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
import { codeFieldConfig } from "./config.js";
import type { CodeValue } from "./types.js";

class CodeCustomField extends CustomField<"code"> {
	type = codeFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"code">) {
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
			localized: this.props?.localized ?? false,
			default: this.props?.default ?? null,
			languages: this.props?.languages ?? [
				...constants.customFields.code.languages,
			],
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"code">;
	}
	override get supportsAi() {
		return true;
	}
	override get jsonSchema() {
		return zodToJsonSchema(this.config.validation?.zod, {
			type: "object",
			description: "A code snippet with its language.",
			properties: {
				language: {
					type: "string",
					enum: this.config.languages,
					description:
						"The language of the code snippet. Infer it from the existing value or the instruction, and keep the existing language unless asked to change it.",
				},
				value: {
					type: "string",
					description:
						"The raw code snippet content. Do not wrap it in markdown code fences.",
				},
			},
			required: ["language", "value"],
			additionalProperties: false,
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
						type: props.db.getDataType("json"),
						nullable: true,
						default: this.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: CodeValue | null) {
		return (value ??
			this.config.default ??
			null) satisfies CFResponse<"code">["value"];
	}
	override formatAiGeneratedValue(value: unknown): CustomFieldAiFormatResponse {
		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value) as unknown;
				const coerced = this.coerceAiCodeValue(parsed);
				if (coerced) {
					return {
						success: true,
						value: coerced,
					};
				}
			} catch {
				// not serialized JSON - treat the string as raw code content
			}

			return {
				success: true,
				value: {
					language: this.fallbackAiLanguage(),
					value: value,
				},
			};
		}

		const coerced = this.coerceAiCodeValue(value);
		return {
			success: true,
			value: coerced ?? {
				language: this.fallbackAiLanguage(),
				value: String(value ?? ""),
			},
		};
	}
	/** Coerces AI output into a `{ language, value }` shape with a configured language. */
	private coerceAiCodeValue(value: unknown): CodeValue | null {
		if (!value || typeof value !== "object" || Array.isArray(value))
			return null;

		const code = value as Partial<CodeValue>;
		if (typeof code.value !== "string") return null;

		return {
			language:
				typeof code.language === "string" &&
				this.config.languages.includes(code.language)
					? code.language
					: this.fallbackAiLanguage(),
			value: code.value,
		};
	}
	private fallbackAiLanguage() {
		return this.config.languages[0] ?? "text";
	}
	override normalizeInputValue(value: unknown) {
		if (typeof value === "string" && value.trim() === "") return null;
		if (value && typeof value === "object" && !Array.isArray(value)) {
			const code = value as Partial<CodeValue>;
			if (typeof code.value === "string" && code.value.trim() === "")
				return null;
		}
		return value;
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.object({
			language: z.string(),
			value: z.string(),
		});

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const val = value as CodeValue;

		if (!this.config.languages.includes(val.language)) {
			return {
				valid: false,
				message: copy(
					"server:core.fields.code.validation.language.error.message",
					{
						data: {
							valid: this.config.languages.join(", "),
						},
					},
				),
			};
		}

		return {
			valid: true,
		};
	}
}

export default CodeCustomField;
