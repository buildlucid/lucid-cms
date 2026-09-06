import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface DatetimeFieldConfig extends SharedFieldConfig {
	type: "datetime";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	localized?: boolean;
	time?: boolean;
	default?: string;
	index?: boolean;
	ui?: FieldUIConfig;
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
