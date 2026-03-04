import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface CheckboxFieldConfig extends SharedFieldConfig {
	type: "checkbox";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		true?: LocaleValue;
		false?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
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
