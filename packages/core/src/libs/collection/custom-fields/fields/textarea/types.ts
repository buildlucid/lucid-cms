import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"textarea">;
	localized?: boolean;
	default?: string;
	index?: true;
	ui?: FieldUIConfig;
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
