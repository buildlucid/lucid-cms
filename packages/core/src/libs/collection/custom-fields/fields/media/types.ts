import type { MediaType } from "../../../../../types/response.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface MediaFieldConfig extends SharedFieldConfig {
	type: "media";
	resource: "media";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
	};
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: number[];
	/** Create a database index for this field. */
	index?: boolean;
	/** Allow more than one selection. The stored value remains an array. */
	multiple?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: {
		/** Require a value when validating the document. */
		required?: boolean;
		/** Minimum number of selected items. */
		minItems?: number;
		/** Maximum number of selected items. */
		maxItems?: number;
		/** Allowed file extensions, such as png or pdf. */
		extensions?: string[];
		/** Restrict selection to a media category. */
		type?: MediaType;
		/** Allowed image width in pixels. */
		width?: {
			/** Minimum dimension in pixels. */
			min?: number;
			/** Maximum dimension in pixels. */
			max?: number;
		};
		/** Allowed image height in pixels. */
		height?: {
			/** Minimum dimension in pixels. */
			min?: number;
			/** Maximum dimension in pixels. */
			max?: number;
		};
	};
}

export type MediaFieldProps = Partial<
	Omit<MediaFieldConfig, "key" | "type" | "resource">
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
