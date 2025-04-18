import z from "zod";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	SchemaDefinition,
	GetSchemaDefinitionProps,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";

class ColourCustomField extends CustomField<"colour"> {
	type = "colour" as const;
	column = "text_value" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"colour">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label: this.props?.details?.label ?? keyToTitle(this.key),
				summary: this.props?.details?.summary,
			},
			presets: this.props?.presets ?? [],
			config: {
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default ?? "",
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"colour">;
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
			null) satisfies CFResponse<"colour">["value"];
	}
	formatResponseMeta() {
		return null satisfies CFResponse<"colour">["meta"];
	}
	cfSpecificValidation(value: unknown) {
		// TODO: down the line, add validation for different colour formats - currently accepts any value
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		return {
			valid: true,
		};
	}
}

export default ColourCustomField;
