import type { AdminText } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";
	details: {
		label?: AdminText;
		summary?: AdminText;
		placeholder?: AdminText;
	};
	options: Array<{ label: AdminText; value: string }>;
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
