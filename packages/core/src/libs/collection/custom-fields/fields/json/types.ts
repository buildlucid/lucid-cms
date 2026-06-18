import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	SharedFieldConfig,
} from "../../types.js";

export type JsonValue = Record<string, unknown> | unknown[];

export interface JsonFieldConfig extends SharedFieldConfig {
	type: "json";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
		placeholder?: AdminCopyInput;
	};
	ai?: CustomFieldUserAiConfig<"json">;
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: JsonValue;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type JsonFieldProps = Partial<Omit<JsonFieldConfig, "type">>;

export type JsonResValue = JsonValue | null;
export type JsonRef = null;

export type JsonCustomFieldMapItem = {
	props: JsonFieldProps;
	config: JsonFieldConfig;
	response: {
		value: JsonResValue;
		ref: JsonRef;
	};
};
