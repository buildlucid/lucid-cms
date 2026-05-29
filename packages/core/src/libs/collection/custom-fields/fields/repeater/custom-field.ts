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
import { repeaterFieldConfig } from "./config.js";

class RepeaterCustomField extends CustomField<"repeater"> {
	type = repeaterFieldConfig.type;
	config;
	key;
	props;
	protected override get sharedValidationFlags() {
		return {
			skipValidation: false,
			skipRequiredValidation: true,
			skipZodValidation: true,
		} as const;
	}
	constructor(key: string, props?: CFProps<"repeater">) {
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
			},
			config: {
				disabled: this.props?.config?.disabled,
			},
			fields: [],
			validation: this.props?.validation,
		} satisfies CFConfig<"repeater">;
	}
	getSchemaDefinition(
		_props: GetSchemaDefinitionProps,
	): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [],
			},
			error: undefined,
		};
	}
	formatResponseValue() {
		return null satisfies CFResponse<"repeater">["value"];
	}
	uniqueValidation(value: unknown) {
		if (
			Array.isArray(value) &&
			typeof this.config.validation?.maxGroups === "number"
		) {
			if (value.length > this.config.validation?.maxGroups) {
				return {
					valid: false,
					message: text.server(
						"core.fields.repeater.validation.max.groups.exceeded",
						{
							data: {
								groups: this.config.validation.maxGroups,
							},
						},
					),
				};
			}
		}

		if (
			Array.isArray(value) &&
			typeof this.config.validation?.minGroups === "number"
		) {
			if (this.config.validation?.minGroups > value.length) {
				return {
					valid: false,
					message: text.server(
						"core.fields.repeater.validation.groups.exceeded.min",
						{
							data: {
								groups: this.config.validation.minGroups,
							},
						},
					),
				};
			}
		}

		return { valid: true };
	}
}

export default RepeaterCustomField;
