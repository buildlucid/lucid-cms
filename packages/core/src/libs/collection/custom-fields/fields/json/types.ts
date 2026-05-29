import type { ZodType } from "zod";
import type { AdminTextDescriptor } from "../../../../i18n/types.js";
import type {
	CustomFieldUserAiConfig,
	SharedFieldConfig,
} from "../../types.js";

export interface JsonFieldConfig extends SharedFieldConfig {
	type: "json";
	details: {
		label?: AdminTextDescriptor;
		summary?: AdminTextDescriptor;
		placeholder?: AdminTextDescriptor;
	};
	ai?: CustomFieldUserAiConfig<"json">;
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: Record<string, unknown>;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type JsonFieldProps = Partial<Omit<JsonFieldConfig, "type">>;

export type JsonResValue = Record<string, unknown> | null;
export type JsonRef = null;

export type JsonCustomFieldMapItem = {
	props: JsonFieldProps;
	config: JsonFieldConfig;
	response: {
		value: JsonResValue;
		ref: JsonRef;
	};
};
