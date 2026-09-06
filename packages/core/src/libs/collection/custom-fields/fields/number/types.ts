import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Hint shown while the input is empty. */
		placeholder?: AdminCopyInput;
	};
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: number | null;
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: FieldValidation<number>;
}

export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "key" | "type">>;

export type NumberResValue = number | null;

export type NumberCustomFieldMapItem = {
	props: NumberFieldProps;
	config: NumberFieldConfig;
	response: {
		value: NumberResValue;
	};
};
