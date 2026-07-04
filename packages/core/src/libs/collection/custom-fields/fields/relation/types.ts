import type {
	DocumentFieldMap,
	DocumentFieldValueMap,
} from "../../../../../types/response.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export type RelationCustomFieldValue = {
	id: number;
	collectionKey: string;
};

export interface RelationFieldConfig extends SharedFieldConfig {
	type: "relation";
	collection: string | string[];
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	localized?: boolean;
	default?: RelationCustomFieldValue[];
	index?: true;
	multiple?: boolean;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type RelationFieldProps = Partial<
	Omit<RelationFieldConfig, "type" | "collection">
> & {
	collection: string | string[];
};

export type RelationResValue = RelationCustomFieldValue[];
export type RelationRef = {
	id: number;
	versionId?: number;
	collectionKey: string;
	fields: DocumentFieldMap | DocumentFieldValueMap | null;
};

export type RelationValidationData = {
	id: number;
	collection_key: string;
};

export type RelationCustomFieldMapItem = {
	props: RelationFieldProps;
	config: RelationFieldConfig;
	response: {
		value: RelationResValue;
		ref: RelationRef;
	};
};
