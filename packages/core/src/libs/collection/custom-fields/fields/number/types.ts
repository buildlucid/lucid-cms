import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	localized?: boolean;
	default?: number | null;
	index?: true;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "type">>;

export type NumberResValue = number | null;
export type NumberRef = null;

export type NumberCustomFieldMapItem = {
	props: NumberFieldProps;
	config: NumberFieldConfig;
	response: {
		value: NumberResValue;
		ref: NumberRef;
	};
};
