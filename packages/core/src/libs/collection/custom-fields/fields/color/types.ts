import type { LocaleValue } from "../../../../../types/shared.js";
import type { SharedFieldConfig } from "../../types.js";

export interface ColorFieldConfig extends SharedFieldConfig {
	type: "color";
	details: {
		label?: LocaleValue;
		summary?: LocaleValue;
	};
	presets: string[];
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
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
