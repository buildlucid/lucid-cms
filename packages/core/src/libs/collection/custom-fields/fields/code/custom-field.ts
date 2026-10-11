import z from "zod";
import constants from "../../../../../constants/constants.js";
import type { ServiceResponse } from "../../../../../exports/types.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	FieldConfig,
	FieldOptions,
	FieldResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import zodSafeParse from "../../utils/zod-safe-parse.js";
import { codeFieldConfig } from "./config.js";
import type { CodeValue } from "./types.js";

const codeValueSchema = z.object({
	language: z.string(),
	value: z.string(),
});

class CodeCustomField extends CustomField<"code"> {
	type = codeFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: FieldOptions<"code">) {
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
				description: this.props?.details?.description,
				placeholder: this.props?.details?.placeholder,
			},
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
		} satisfies FieldConfig<"code">;
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
	formatResponseValue(value?: unknown) {
		const responseValue = value ?? this.config.default ?? null;
		if (responseValue === null) return null;

		const parsed = codeValueSchema.safeParse(responseValue);
		return parsed.success
			? (parsed.data satisfies FieldResponse<"code">["value"])
			: null;
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
		const valueValidate = zodSafeParse(value, codeValueSchema);
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
