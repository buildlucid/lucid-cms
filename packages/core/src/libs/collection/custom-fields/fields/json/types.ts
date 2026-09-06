import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export type JsonValue = Record<string, unknown> | unknown[];

export interface JsonFieldConfig extends SharedFieldConfig {
	type: "json";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"json">;
	localized?: boolean;
	default?: JsonValue | null;
	index?: boolean;
	ui?: FieldUIConfig;
	validation?: FieldValidation<JsonValue>;
}

export type JsonFieldProps = Partial<Omit<JsonFieldConfig, "key" | "type">>;

export type JsonResValue = JsonValue | null;

export type JsonCustomFieldMapItem = {
	props: JsonFieldProps;
	config: JsonFieldConfig;
	response: {
		value: JsonResValue;
	};
};
