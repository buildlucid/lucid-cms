import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
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
	localized?: boolean;
	default?: Record<string, unknown>;
	index?: true;
	ui?: FieldUIConfig;
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
