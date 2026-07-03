import type { ServiceResponse } from "../../../../../types.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import { collapsibleFieldConfig } from "./config.js";

class CollapsibleCustomField extends CustomField<"collapsible"> {
	type = collapsibleFieldConfig.type;
	config;
	key: string;
	props?: CFProps<"collapsible">;
	protected override get sharedValidationFlags() {
		return {
			skipValidation: true,
			skipRequiredValidation: true,
			skipZodValidation: true,
		} as const;
	}
	constructor(key: string, props?: CFProps<"collapsible">) {
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
			},
			output: this.props?.output ?? "nested",
			defaultOpen: this.props?.defaultOpen ?? false,
			ui: {
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			fields: [],
		} satisfies CFConfig<"collapsible">;
	}
	getSchemaDefinition(): Awaited<ServiceResponse<SchemaDefinition>> {
		return {
			data: {
				columns: [],
			},
			error: undefined,
		};
	}
	formatResponseValue() {
		return null satisfies CFResponse<"collapsible">["value"];
	}
	uniqueValidation() {
		return {
			valid: true,
		};
	}
}

export default CollapsibleCustomField;
