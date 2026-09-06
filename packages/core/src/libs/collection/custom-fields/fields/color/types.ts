import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface ColorFieldConfig extends SharedFieldConfig {
	type: "color";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Color values offered as preset swatches. */
	presets: string[];
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

export type ColorFieldProps = Partial<Omit<ColorFieldConfig, "key" | "type">>;

export type ColorResValue = string | null;

export type ColorCustomFieldMapItem = {
	props: ColorFieldProps;
	config: ColorFieldConfig;
	response: {
		value: ColorResValue;
	};
};
