import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Label displayed for a checked value. */
		true?: AdminCopyInput;
		/** Label displayed for an unchecked value. */
		false?: AdminCopyInput;
	};
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: boolean;
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

export type CheckboxFieldProps = Partial<
	Omit<CheckboxFieldConfig, "key" | "type">
>;

export type CheckboxResValue = boolean | null;

export type CheckboxCustomFieldMapItem = {
	props: CheckboxFieldProps;
	config: CheckboxFieldConfig;
	response: {
		value: CheckboxResValue;
	};
};
