import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	options: Array<{ label: AdminCopyInput; value: string }>;
	localized?: boolean;
	default?: string;
	index?: true;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
	};
}

export type SelectFieldProps = Partial<Omit<SelectFieldConfig, "type">>;

export type SelectReValue = string | null;
export type SelectRef = null;

export type SelectCustomFieldMapItem = {
	props: SelectFieldProps;
	config: SelectFieldConfig;
	response: {
		value: SelectReValue;
		ref: SelectRef;
	};
};
