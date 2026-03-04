import type { ZodType } from "zod";
import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface RichTextFieldConfig extends SharedFieldConfig {
	type: "rich-text";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		useTranslations?: boolean;
		default?: Record<string, unknown>;
		isHidden?: boolean;
		isDisabled?: boolean;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}

export type RichTextFieldProps = Partial<Omit<RichTextFieldConfig, "type">>;

export type RichTextResValue = Record<string, unknown> | null;
export type RichTextRef = null;

export type RichTextCustomFieldMapItem = {
	props: RichTextFieldProps;
	config: RichTextFieldConfig;
	response: {
		value: RichTextResValue;
		ref: RichTextRef;
	};
};
