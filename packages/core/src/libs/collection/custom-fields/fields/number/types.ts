import type { ZodType } from "zod";
import type { AdminText } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface NumberFieldConfig extends SharedFieldConfig {
	type: "number";
	details: {
		label?: AdminText;
		summary?: AdminText;
		placeholder?: AdminText;
	};
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: number | null;
	};
	validation?: {
		required?: boolean;
		zod?: ZodType<unknown>;
	};
}

export type NumberFieldProps = Partial<Omit<NumberFieldConfig, "type">>;

export type NumberResValue = number | null;
export type NumberRef = null;

export type NumberCustomFieldMapItem = {
	props: NumberFieldProps;
	config: NumberFieldConfig;
	response: {
		value: NumberResValue;
		ref: NumberRef;
	};
};
