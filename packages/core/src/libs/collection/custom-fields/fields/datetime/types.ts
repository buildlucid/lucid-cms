import type { ZodType } from "zod";
import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		useTime?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
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
