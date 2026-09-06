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
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Hint shown while the input is empty. */
		placeholder?: AdminCopyInput;
	};
	/** Generation instructions and context for this field. */
	ai?: CustomFieldUserAiConfig<"code">;
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: CodeValue | null;
	/** Language options offered in the admin editor. */
	languages: string[];
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
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
