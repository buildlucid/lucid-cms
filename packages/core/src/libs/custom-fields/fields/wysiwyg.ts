import z from "zod";
import CustomField from "../custom-field.js";
import sanitizeHtml from "sanitize-html";
import zodSafeParse from "../utils/zod-safe-parse.js";
import keyToTitle from "../utils/key-to-title.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";

class WysiwygCustomField extends CustomField<"wysiwyg"> {
	type = "wysiwyg" as const;
	column = "text_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"wysiwyg">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			config: {
				useTranslations: this.props?.config?.useTranslations ?? true,
				default: this.props?.config?.default ?? "",
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"wysiwyg">;
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
						type: props.db.getDataType("text"),
						nullable: true,
						default: this.config.config.default,
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: string | null) {
		return (value ??
			this.config.config.default ??
			null) satisfies CFResponse<"wysiwyg">["value"];
	}
	formatResponseMeta() {
		return null satisfies CFResponse<"wysiwyg">["meta"];
	}
	cfSpecificValidation(value: string) {
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const sanitizedValue = sanitizeHtml(value);

		if (this.config.validation?.zod) {
			return zodSafeParse(sanitizedValue, this.config.validation?.zod);
		}

		return { valid: true };
	}
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
}

export default WysiwygCustomField;
