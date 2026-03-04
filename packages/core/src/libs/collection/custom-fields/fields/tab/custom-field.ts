import type { ServiceResponse } from "../../../../../types.js";
import CustomField from "../../custom-field.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import { tabFieldConfig } from "./config.js";

class TabCustomField extends CustomField<"tab"> {
	type = tabFieldConfig.type;
	config;
	key: string;
	props?: CFProps<"tab">;

	protected override get sharedValidationFlags() {
		return {
			skipValidation: true,
			skipRequiredValidation: true,
			skipZodValidation: true,
		} as const;
	}

	constructor(key: string, props?: CFProps<"tab">) {
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
			fields: [],
		} satisfies CFConfig<"tab">;
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
		return null satisfies CFResponse<"tab">["value"];
	}
	uniqueValidation() {
		return {
			valid: true,
		};
	}
}

export default TabCustomField;
