import type { ZodType } from "zod";
import type { MediaType } from "../../../../../types/response.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface RichTextFieldConfig extends SharedFieldConfig {
	type: "rich-text";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"rich-text">;
	localized?: boolean;
	default?: Record<string, unknown>;
	index?: true;
	editor?: {
		links?: {
			external?: boolean;
			internal?: boolean | string[];
		};
		media?: boolean | Array<Extract<MediaType, "image" | "audio" | "video">>;
		bricks?: boolean | string[];
		variables?: boolean | string[];
		appearance?: "default" | "seamless";
		fullscreen?: boolean;
	};
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown> | undefined;
	};
}

export type RichTextFieldProps = Partial<Omit<RichTextFieldConfig, "type">>;

export type RichTextResValue = Record<string, unknown> | null;
export type RichTextRef = null;

export type RichTextCustomFieldMapItem = {
	props: RichTextFieldProps;
	config: RichTextFieldConfig;
	response: {
		value: RichTextResValue;
		ref: RichTextRef;
	};
};
