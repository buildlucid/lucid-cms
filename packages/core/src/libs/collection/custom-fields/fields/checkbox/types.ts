import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		true?: AdminCopyInput;
		false?: AdminCopyInput;
	};
	localized?: boolean;
	default?: boolean;
	index?: true;
	ui?: FieldUIConfig;
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
