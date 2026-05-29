import type { ZodType } from "zod";
import type { AdminCopyDescriptor } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface TextareaFieldConfig extends SharedFieldConfig {
	type: "textarea";
	details: {
		label?: AdminCopyDescriptor;
		summary?: AdminCopyDescriptor;
		placeholder?: AdminCopyDescriptor;
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
