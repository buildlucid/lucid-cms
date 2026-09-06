import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export type LinkResValue = {
	url: string | null;
	target: string | null;
	label: string | null;
} | null;

export interface LinkFieldConfig extends SharedFieldConfig {
	type: "link";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to enter. */
		description?: AdminCopyInput;
		/** Hint shown while the input is empty. */
		placeholder?: AdminCopyInput;
	};
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Initial value for a new field. */
	default?: LinkResValue;
	/** Create a database index for this field. */
	index?: boolean;
	/** Editor visibility and layout. */
	ui?: FieldUIConfig;
	/** Checks applied when saving field values. */
	validation?: {
		/** Require a value when validating the document. */
		required?: boolean;
	};
}

export type LinkFieldProps = Partial<Omit<LinkFieldConfig, "key" | "type">>;

export type LinkCustomFieldMapItem = {
	props: LinkFieldProps;
	config: LinkFieldConfig;
	response: {
		value: LinkResValue;
	};
};
