import CustomField from "../custom-field.js";
import keyToTitle from "../utils/key-to-title.js";
import type {
	CFConfig,
	CFProps,
	CFResponse,
	SchemaDefinition,
} from "../types.js";
import type { ServiceResponse } from "../../../types.js";

class TabCustomField extends CustomField<"tab"> {
	type = "tab" as const;
	config;
	key: string;
	props?: CFProps<"tab">;
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
	cfSpecificValidation() {
		return {
			valid: true,
		};
	}
	get translationsEnabled() {
		return false;
	}
	get defaultValue() {
		return null;
	}
}

export default TabCustomField;
