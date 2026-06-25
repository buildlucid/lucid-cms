import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	localized?: boolean;
	time?: boolean;
	default?: string;
	index?: true;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type DatetimeFieldProps = Partial<Omit<DatetimeFieldConfig, "type">>;

export type DatetimeResValue = string | null;
export type DatetimeRef = null;

export type DatetimeCustomFieldMapItem = {
	props: DatetimeFieldProps;
	config: DatetimeFieldConfig;
	response: {
		value: DatetimeResValue;
		ref: DatetimeRef;
	};
};
