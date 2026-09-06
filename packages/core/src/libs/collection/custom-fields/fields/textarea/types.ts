import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
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
	ai?: CustomFieldUserAiConfig<"textarea">;
	/** Store a value per content locale when collection localization is enabled. Defaults to true. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: string;
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: FieldValidation<string>;
}

export type TextareaFieldProps = Partial<
	Omit<TextareaFieldConfig, "key" | "type">
>;

export type TextareaResValue = string | null;

export type TextareaCustomFieldMapItem = {
	props: TextareaFieldProps;
	config: TextareaFieldConfig;
	response: {
		value: TextareaResValue;
	};
};
