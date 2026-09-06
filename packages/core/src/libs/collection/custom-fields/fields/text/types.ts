import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export interface TextFieldConfig extends SharedFieldConfig {
	type: "text";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"text">;
	localized?: boolean;
	default?: string;
	index?: boolean;
	ui?: FieldUIConfig;
	validation?: FieldValidation<string>;
}

export type TextFieldProps = Partial<Omit<TextFieldConfig, "key" | "type">>;

export type TextResValue = string | null;

export type TextCustomFieldMapItem = {
	props: TextFieldProps;
	config: TextFieldConfig;
	response: {
		value: TextResValue;
	};
};
