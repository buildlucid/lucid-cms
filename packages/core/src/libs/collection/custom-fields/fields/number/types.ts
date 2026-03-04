import type { ZodType } from "zod";
import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: number | null;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "type">>;

export type NumberResValue = number | null;
export type NumberRef = null;

export type NumberCustomFieldMapItem = {
	props: NumberFieldProps;
	config: NumberFieldConfig;
	response: {
		value: NumberResValue;
		ref: NumberRef;
	};
};
