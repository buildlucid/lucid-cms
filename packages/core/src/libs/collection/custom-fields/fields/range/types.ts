import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface RangeFieldConfig extends SharedFieldConfig {
	type: "range";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	min: number;
	max: number;
	step: number;
	localized?: boolean;
	default?: number[];
	index?: true;
	/** Number of slider thumbs and stored values. Defaults to one. */
	thumbs?: 1 | 2;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type RangeFieldProps = Partial<Omit<RangeFieldConfig, "type">>;

export type RangeResValue = number[];
export type RangeRef = null;

export type RangeCustomFieldMapItem = {
	props: RangeFieldProps;
	config: RangeFieldConfig;
	response: {
		value: RangeResValue;
		ref: RangeRef;
	};
};
