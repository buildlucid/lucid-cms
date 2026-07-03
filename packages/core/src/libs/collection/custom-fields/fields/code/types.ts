import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
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
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"code">;
	localized?: boolean;
	default?: CodeValue | null;
	/** Language options offered in the admin editor. */
	languages: string[];
	index?: true;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type CodeFieldProps = Partial<Omit<CodeFieldConfig, "type">>;

export type CodeResValue = CodeValue | null;
export type CodeRef = null;

export type CodeCustomFieldMapItem = {
	props: CodeFieldProps;
	config: CodeFieldConfig;
	response: {
		value: CodeResValue;
		ref: CodeRef;
	};
};
