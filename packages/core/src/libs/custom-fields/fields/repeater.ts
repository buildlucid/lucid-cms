import T from "../../../translations/index.js";
import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	SchemaDefinition,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";

class RepeaterCustomField extends CustomField<"repeater"> {
	type = "repeater" as const;
	config;
	key;
	props;
	constructor(key: string, props?: CFProps<"repeater">) {
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
			config: {
				isDisabled: this.props?.config?.isDisabled,
			},
			fields: [],
			validation: this.props?.validation,
		} satisfies CFConfig<"repeater">;
	}
	// Methods
	getSchemaDefinition(): Awaited<ServiceResponse<SchemaDefinition>> {
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
	cfSpecificValidation(value: unknown) {
		if (
			Array.isArray(value) &&
			typeof this.config.validation?.maxGroups === "number"
		) {
			if (value.length > this.config.validation?.maxGroups) {
				return {
					valid: false,
					message: T("repeater_max_groups_exceeded", {
						groups: this.config.validation.maxGroups,
					}),
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
					message: T("repeater_groups_exceeded_min", {
						groups: this.config.validation.minGroups,
					}),
				};
			}
		}

		return { valid: true };
	}
	get translationsEnabled() {
		return false;
	}
	get defaultValue() {
		return null;
	}
}

export default RepeaterCustomField;
