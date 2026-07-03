import type { ZodType } from "zod";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	FieldUIConfig,
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
	localized?: boolean;
	default?: JsonValue | null;
	index?: true;
	ui?: FieldUIConfig;
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
