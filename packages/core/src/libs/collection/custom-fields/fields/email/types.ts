import type { EmailType } from "../../../../email/types.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export interface EmailFieldConfig extends SharedFieldConfig {
	type: "email";
	resource: "emails";
	/** Copy shown beside the input in the admin. */
	details: {
		/** Field name shown to editors. */
		label?: AdminCopyInput;
		/** Help text explaining what to select. */
		description?: AdminCopyInput;
	};
	/** Store a value per content locale when collection localization is enabled. Defaults to false. */
	localized?: boolean;
	/** Create a database index for this field. */
	index?: boolean;
	/** Allow more than one selection. The stored value remains an array. */
	multiple?: boolean;
	/** Allows internal emails such as invitations and password resets, defaulting to `false` for project emails only and always excluding system notifications. */
	allowInternal?: boolean;
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

export type EmailFieldProps = Partial<
	Omit<EmailFieldConfig, "key" | "type" | "resource">
>;

export type EmailResValue = number[];

export type EmailValidationData = {
	id: number;
	type: EmailType;
};

export type EmailCustomFieldMapItem = {
	props: EmailFieldProps;
	config: EmailFieldConfig;
	response: {
		value: EmailResValue;
	};
};
