import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		true?: AdminCopyInput;
		false?: AdminCopyInput;
	};
	localized?: boolean;
	default?: boolean;
	index?: boolean;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
	};
}

export type CheckboxFieldProps = Partial<
	Omit<CheckboxFieldConfig, "key" | "type">
>;

export type CheckboxResValue = boolean | null;

export type CheckboxCustomFieldMapItem = {
	props: CheckboxFieldProps;
	config: CheckboxFieldConfig;
	response: {
		value: CheckboxResValue;
	};
};
