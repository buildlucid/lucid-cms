import type { ZodType } from "zod";
import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface TextFieldConfig extends SharedFieldConfig {
	type: "text";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		default?: string;
		isHidden?: boolean;
		isDisabled?: boolean;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}

export type TextFieldProps = Partial<Omit<TextFieldConfig, "type">>;

export type TextResValue = string | null;
export type TextRef = null;

export type TextCustomFieldMapItem = {
	props: TextFieldProps;
	config: TextFieldConfig;
	response: {
		value: TextResValue;
		ref: TextRef;
	};
};
