import type { Media, MediaType } from "../../../../../types/response.js";
import type { SharedFieldConfig } from "../../types.js";

export interface MediaFieldConfig extends SharedFieldConfig {
	type: "media";
	details: {
		label?: string | Record<string, string>;
		summary?: string | Record<string, string>;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		multiple?: boolean;
		default?: number[];
	};
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
		extensions?: string[];
		type?: MediaType;
		width?: {
			min?: number;
			max?: number;
		};
		height?: {
			min?: number;
			max?: number;
		};
	};
}

export type MediaFieldProps = Partial<Omit<MediaFieldConfig, "type">>;

export type MediaResValue = number[];
export type MediaRef = Media;

export type MediaValidationData = {
	id: number;
	file_extension: string;
	width: number | null;
	height: number | null;
	type: string;
};

export type MediaCustomFieldMapItem = {
	props: MediaFieldProps;
	config: MediaFieldConfig;
	response: {
		value: MediaResValue;
		ref: MediaRef | null;
	};
};
