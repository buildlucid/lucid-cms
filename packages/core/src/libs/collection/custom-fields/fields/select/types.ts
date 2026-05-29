import type { AdminTextDescriptor } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";
	details: {
		label?: AdminTextDescriptor;
		summary?: AdminTextDescriptor;
		placeholder?: AdminTextDescriptor;
	};
	options: Array<{ label: AdminTextDescriptor; value: string }>;
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: string;
	};
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
