import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export type RelationCustomFieldValue = {
	id: number;
	collectionKey: string;
};

export interface RelationFieldConfig extends SharedFieldConfig {
	type: "relation";
	resource: "documents";
	/** Collection key or keys from which editors may select documents. */
	collection: string | string[];
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
	default?: RelationCustomFieldValue[];
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

export type RelationFieldProps = Partial<
	Omit<RelationFieldConfig, "key" | "type" | "resource" | "collection">
> & {
	/** Collection key or keys from which editors may select documents. */
	collection: string | string[];
};

export type RelationResValue = RelationCustomFieldValue[];

export type RelationValidationData = {
	id: number;
	collection_key: string;
};

export type RelationCustomFieldMapItem = {
	props: RelationFieldProps;
	config: RelationFieldConfig;
	response: {
		value: RelationResValue;
	};
};
