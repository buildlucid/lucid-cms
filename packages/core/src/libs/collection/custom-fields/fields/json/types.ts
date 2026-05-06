import type { ZodType } from "zod";
import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface JsonFieldConfig extends SharedFieldConfig {
	type: "json";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
		placeholder?: LocaleValue;
	};
	config: {
		translations?: boolean;
		hidden?: boolean;
		disabled?: boolean;
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
