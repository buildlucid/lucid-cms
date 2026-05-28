import type { ZodType } from "zod";
import type { AdminText } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
	details: {
		label?: AdminText;
		summary?: AdminText;
		placeholder?: AdminText;
	};
	ai?: CustomFieldUserAiConfig<"textarea">;
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: string;
	};
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
