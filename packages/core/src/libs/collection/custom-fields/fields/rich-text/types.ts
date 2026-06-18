import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface RichTextFieldConfig extends SharedFieldConfig {
	type: "rich-text";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"rich-text">;
	config: {
		localized?: boolean;
		default?: Record<string, unknown>;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
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
