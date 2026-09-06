import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";
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
	/** Include a time picker alongside the date. */
	time?: boolean;
	/** Initial value for a new field. */
	default?: string;
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: FieldValidation<string>;
}

export type DatetimeFieldProps = Partial<
	Omit<DatetimeFieldConfig, "key" | "type">
>;

export type DatetimeResValue = string | null;

export type DatetimeCustomFieldMapItem = {
	props: DatetimeFieldProps;
	config: DatetimeFieldConfig;
	response: {
		value: DatetimeResValue;
	};
};
