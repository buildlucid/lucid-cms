import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Hint shown while the input is empty. */
		placeholder?: AdminCopyInput;
	};
	/** Choices with editor-facing labels and stable stored values. */
	options: Array<{ label: AdminCopyInput; value: string }>;
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: string;
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: {
		/** Require a value when validating the document. */
		required?: boolean;
	};
}

export type SelectFieldProps = Partial<Omit<SelectFieldConfig, "key" | "type">>;

export type SelectReValue = string | null;

export type SelectCustomFieldMapItem = {
	props: SelectFieldProps;
	config: SelectFieldConfig;
	response: {
		value: SelectReValue;
	};
};
