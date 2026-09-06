import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	FieldValidation,
	SharedFieldConfig,
} from "../../types.js";

export type CodeValue = {
	language: string;
	value: string;
};

export interface CodeFieldConfig extends SharedFieldConfig {
	type: "code";
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"code">;
	localized?: boolean;
	default?: CodeValue | null;
	/** Language options offered in the admin editor. */
	languages: string[];
	index?: boolean;
	ui?: FieldUIConfig;
	validation?: FieldValidation<CodeValue>;
}

export type CodeFieldProps = Partial<Omit<CodeFieldConfig, "key" | "type">>;

export type CodeResValue = CodeValue | null;

export type CodeCustomFieldMapItem = {
	props: CodeFieldProps;
	config: CodeFieldConfig;
	response: {
		value: CodeResValue;
	};
};
