import type { ZodType } from "zod";
import type { AdminText } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";
	details: {
		label?: AdminText;
		summary?: AdminText;
		placeholder?: AdminText;
	};
	config: {
		localized?: boolean;
		time?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: string;
	};
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
