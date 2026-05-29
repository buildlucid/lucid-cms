import { isValid } from "date-fns";
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
import { datetimeFieldConfig } from "./config.js";

class DatetimeCustomField extends CustomField<"datetime"> {
	type = datetimeFieldConfig.type;
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
				label:
					this.props?.details?.label ??
					text.admin(`fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			config: {
				localized: this.props?.config?.localized ?? false,
				time: this.props?.config?.time ?? false,
				default: this.props?.config?.default ?? "",
				hidden: this.props?.config?.hidden,
				disabled: this.props?.config?.disabled,
				index: this.props?.config?.index,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"datetime">;
	}
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
	override normalizeInputValue(value: unknown) {
		return typeof value === "string" ? value.trim() : value;
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.union([z.string(), z.number(), z.date()]);

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		const date = new Date(value as string | number | Date);
		if (!isValid(date)) {
			return {
				valid: false,
				message: text.server("core.fields.date.validation.invalid"),
			};
		}

		return {
			valid: true,
		};
	}
}

export default DatetimeCustomField;
