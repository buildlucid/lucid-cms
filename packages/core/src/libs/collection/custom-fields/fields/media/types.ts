import type { MediaType } from "../../../../../types/response.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface MediaFieldConfig extends SharedFieldConfig {
	type: "media";
	resource: "media";
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	localized?: boolean;
	default?: number[];
	index?: true;
	multiple?: boolean;
	ui?: FieldUIConfig;
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

export type MediaFieldProps = Partial<
	Omit<MediaFieldConfig, "type" | "resource">
>;

export type MediaResValue = number[];

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
	};
};
