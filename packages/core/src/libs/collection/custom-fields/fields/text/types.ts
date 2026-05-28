import type { ZodType } from "zod";
import type { AdminText } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TextFieldConfig extends SharedFieldConfig {
	type: "text";
	details: {
		label?: AdminText;
		summary?: AdminText;
		placeholder?: AdminText;
	};
	ai?: CustomFieldUserAiConfig<"text">;
	config: {
		localized?: boolean;
		default?: string;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
	};
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
