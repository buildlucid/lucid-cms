import merge from "lodash.merge";
import z from "zod";
import type { ServiceResponse } from "../../../../../types.js";
import { adminText } from "../../../../i18n/admin-text.js";
import { serverText } from "../../../../i18n/index.js";
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
import { selectFieldConfig } from "./config.js";

class SelectCustomField extends CustomField<"select"> {
	type = selectFieldConfig.type;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"select">) {
		super();
		this.key = key;
		this.props = props;
		this.config = {
			key: this.key,
			type: this.type,
			details: {
				label:
					this.props?.details?.label ??
					adminText(`fields.${this.type}.${this.key}.label`, {
						fallback: keyToTitle(this.key),
					}),
				summary: this.props?.details?.summary,
				placeholder: this.props?.details?.placeholder,
			},
			options: this.props?.options ?? [],
			config: {
				localized: this.props?.config?.localized ?? false,
				default: this.props?.config?.default ?? "",
				hidden: this.props?.config?.hidden,
				disabled: this.props?.config?.disabled,
				index: this.props?.config?.index,
			},
			validation: this.props?.validation,
		} satisfies CFConfig<"select">;
	}
	get errors() {
		return merge(super.errors, {
			required: {
				message: serverText("core.fields.select.validation.required"),
			},
		});
	}
	override normalizeInputValue(value: unknown) {
		return typeof value === "string" ? value.trim() : value;
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
					},
				],
			},
			error: undefined,
		};
	}
	formatResponseValue(value?: string | null) {
		return (value ??
			this.config.config.default ??
			null) satisfies CFResponse<"select">["value"];
	}
	uniqueValidation(value: unknown) {
		const valueSchema = z.string();

		const valueValidate = zodSafeParse(value, valueSchema);
		if (!valueValidate.valid) return valueValidate;

		if (this.config.options) {
			const optionValues = this.config.options.map((option) => option.value);
			if (!optionValues.includes(value as string)) {
				return {
					valid: false,
					message: serverText("core.fields.select.validation.option.invalid"),
				};
			}
		}

		return { valid: true };
	}
}

export default SelectCustomField;
