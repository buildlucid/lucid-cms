import T from "../../../translations/index.js";
import z from "zod/v4";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import zodSafeParse from "../utils/zod-safe-parse.js";
import { isValid } from "date-fns";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	GetSchemaDefinitionProps,
	SchemaDefinition,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";

class DatetimeCustomField extends CustomField<"datetime"> {
	type = "datetime" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"datetime">) {
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
				useTranslations: this.props?.config?.useTranslations ?? false,
				default: this.props?.config?.default ?? "",
				isHidden: this.props?.config?.isHidden,
				isDisabled: this.props?.config?.isDisabled,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"datetime">;
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
						type: props.db.getDataType("timestamp"),
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
			null) satisfies CFResponse<"datetime">["value"];
	}
	cfSpecificValidation(value: unknown) {
		const valueSchema = z.union([z.string(), z.number(), z.date()]);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const date = new Date(value as string | number | Date);
		if (!isValid(date)) {
			return {
				valid: false,
				message: T("field_date_invalid"),
			};
		}

		return {
			valid: true,
		};
	}
	get translationsEnabled() {
		return this.config.config.useTranslations;
	}
	get defaultValue() {
		return this.config.config.default;
	}
}

export default DatetimeCustomField;
