import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export type RelationCustomFieldValue = {
	id: number;
	collectionKey: string;
};

export interface RelationFieldConfig extends SharedFieldConfig {
	type: "relation";
	resource: "documents";
	collection: string | string[];
	details: {
		label?: AdminCopyInput;
		description?: AdminCopyInput;
	};
	localized?: boolean;
	default?: RelationCustomFieldValue[];
	index?: boolean;
	multiple?: boolean;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type RelationFieldProps = Partial<
	Omit<RelationFieldConfig, "key" | "type" | "resource" | "collection">
> & {
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
