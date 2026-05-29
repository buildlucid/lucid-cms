import type { AdminCopyDescriptor } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	details: {
		label?: AdminCopyDescriptor;
		summary?: AdminCopyDescriptor;
		true?: AdminCopyDescriptor;
		false?: AdminCopyDescriptor;
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
