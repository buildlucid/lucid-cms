import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface ColorFieldConfig extends SharedFieldConfig {
	type: "color";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	presets: string[];
	localized?: boolean;
	default?: string;
	index?: true;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
	};
}

export type ColorFieldProps = Partial<Omit<ColorFieldConfig, "type">>;

export type ColorResValue = string | null;
export type ColorRef = null;

export type ColorCustomFieldMapItem = {
	props: ColorFieldProps;
	config: ColorFieldConfig;
	response: {
		value: ColorResValue;
		ref: ColorRef;
	};
};
