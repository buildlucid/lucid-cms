import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TextFieldConfig extends SharedFieldConfig {
	type: "text";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"text">;
	localized?: boolean;
	default?: string;
	index?: true;
	ui?: FieldUIConfig;
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
