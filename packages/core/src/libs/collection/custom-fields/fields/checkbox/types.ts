import type { AdminTextDescriptor } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	details: {
		label?: AdminTextDescriptor;
		summary?: AdminTextDescriptor;
		true?: AdminTextDescriptor;
		false?: AdminTextDescriptor;
	};
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: boolean;
	};
	validation?: {
		required?: boolean;
	};
}

export type CheckboxFieldProps = Partial<Omit<CheckboxFieldConfig, "type">>;

export type CheckboxResValue = boolean | null;
export type CheckboxRef = null;

export type CheckboxCustomFieldMapItem = {
	props: CheckboxFieldProps;
	config: CheckboxFieldConfig;
	response: {
		value: CheckboxResValue;
		ref: CheckboxRef;
	};
};
