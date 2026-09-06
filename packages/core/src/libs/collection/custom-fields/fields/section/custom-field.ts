import type { ServiceResponse } from "../../../../../exports/types.js";
import { copy } from "../../../../i18n/index.js";
import CustomField from "../../custom-field.js";
import type {
	FieldConfig,
	FieldOptions,
	FieldResponse,
	SchemaDefinition,
} from "../../types.js";
import keyToTitle from "../../utils/key-to-title.js";
import { sectionFieldConfig } from "./config.js";

class SectionCustomField extends CustomField<"section"> {
	type = sectionFieldConfig.type;
	config;
	key: string;
	props?: FieldOptions<"section">;
	protected override get sharedValidationFlags() {
		return {
			skipValidation: true,
			skipRequiredValidation: true,
			skipZodValidation: true,
		} as const;
	}
	constructor(key: string, props?: FieldOptions<"section">) {
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
				description: this.props?.details?.description,
			},
			output: this.props?.output ?? "nested",
			ui: {
				condition: this.props?.ui?.condition,
				width: this.props?.ui?.width,
			},
			fields: [],
		} satisfies FieldConfig<"section">;
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
		return null satisfies FieldResponse<"section">["value"];
	}
	uniqueValidation() {
		return {
			valid: true,
		};
	}
}

export default SectionCustomField;
