import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"textarea">;
	localized?: boolean;
	default?: string;
	index?: boolean;
	ui?: FieldUIConfig;
	validation?: FieldValidation<string>;
}

export type TextareaFieldProps = Partial<
	Omit<TextareaFieldConfig, "key" | "type">
>;

export type TextareaResValue = string | null;

export type TextareaCustomFieldMapItem = {
	props: TextareaFieldProps;
	config: TextareaFieldConfig;
	response: {
		value: TextareaResValue;
	};
};
