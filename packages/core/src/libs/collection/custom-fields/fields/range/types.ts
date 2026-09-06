import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface RangeFieldConfig extends SharedFieldConfig {
	type: "range";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Lowest slider value. Defaults to 0. */
	min: number;
	/** Highest slider value. Defaults to 100. */
	max: number;
	/** Increment between slider values. Defaults to 1. */
	step: number;
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: number[];
	/** Create a database index for this field. */
	index?: boolean;
	/** Number of slider thumbs and stored values. Defaults to one. */
	thumbs?: 1 | 2;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: FieldValidation<number[]>;
}

export type RangeFieldProps = Partial<Omit<RangeFieldConfig, "key" | "type">>;

export type RangeResValue = number[];

export type RangeCustomFieldMapItem = {
	props: RangeFieldProps;
	config: RangeFieldConfig;
	response: {
		value: RangeResValue;
	};
};
