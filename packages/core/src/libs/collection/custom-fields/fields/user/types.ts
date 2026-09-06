import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface UserFieldConfig extends SharedFieldConfig {
	type: "user";
	resource: "users";
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
	};
}

export type UserFieldProps = Partial<
	Omit<UserFieldConfig, "key" | "type" | "resource">
>;

export type UserResValue = number[];

export type UserValidationData = {
	id: number;
};

export type UserCustomFieldMapItem = {
	props: UserFieldProps;
	config: UserFieldConfig;
	response: {
		value: UserResValue;
	};
};
