import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface RangeFieldConfig extends SharedFieldConfig {
	type: "range";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	min: number;
	max: number;
	step: number;
	localized?: boolean;
	default?: number[];
	index?: boolean;
	/** Number of slider thumbs and stored values. Defaults to one. */
	thumbs?: 1 | 2;
	ui?: FieldUIConfig;
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
