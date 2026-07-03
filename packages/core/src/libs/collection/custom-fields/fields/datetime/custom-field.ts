import { isValid } from "date-fns";
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
					copy(`admin:fields.${this.type}.${this.key}.label`, {
						defaultMessage: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			localized: this.props?.localized ?? false,
			time: this.props?.time ?? false,
			default: this.props?.default ?? "",
			index: this.props?.index,
			ui: {
				hidden: this.props?.ui?.hidden,
				disabled: this.props?.ui?.disabled,
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
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
				message: copy("server:core.fields.date.validation.invalid"),
			};
		}

		return {
			valid: true,
		};
	}
}

export default DatetimeCustomField;
