import type { AdminCopyDescriptor } from "../../../../i18n/types.js";
import type { SharedFieldConfig } from "../../types.js";

export interface ColorFieldConfig extends SharedFieldConfig {
	type: "color";
	details: {
		label?: AdminCopyDescriptor;
		summary?: AdminCopyDescriptor;
	};
	presets: string[];
	config: {
		localized?: boolean;
		hidden?: boolean;
		disabled?: boolean;
		index?: true;
		default?: string;
	};
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
