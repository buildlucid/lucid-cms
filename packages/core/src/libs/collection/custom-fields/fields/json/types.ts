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
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Hint shown while the input is empty. */
		placeholder?: AdminCopyInput;
	};
	/** Generation instructions and context for this field. */
	ai?: CustomFieldUserAiConfig<"json">;
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: JsonValue | null;
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
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
