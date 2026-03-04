import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface SelectFieldConfig extends SharedFieldConfig {
	type: "select";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	options: Array<{ label: LocaleValue; value: string }>;
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
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
