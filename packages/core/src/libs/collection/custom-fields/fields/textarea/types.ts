import type { ZodType } from "zod";
import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		default?: string;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type TextareaFieldProps = Partial<Omit<TextareaFieldConfig, "type">>;

export type TextareaResValue = string | null;
export type TextareaRef = null;

export type TextareaCustomFieldMapItem = {
	props: TextareaFieldProps;
	config: TextareaFieldConfig;
	response: {
		value: TextareaResValue;
		ref: TextareaRef;
	};
};
