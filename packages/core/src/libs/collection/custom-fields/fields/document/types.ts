import type { DocumentField } from "../../../../../types/response.js";
import type { AdminCopyInput } from "../../../../i18n/types.js";
import type { FieldUIConfig, SharedFieldConfig } from "../../types.js";

export type DocumentFieldValue = {
	id: number;
	collectionKey: string;
};

export interface DocumentFieldConfig extends SharedFieldConfig {
	type: "document";
	collection: string | string[];
	details: {
		label?: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	localized?: boolean;
	default?: DocumentFieldValue[];
	index?: true;
	multiple?: boolean;
	ui?: FieldUIConfig;
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type DocumentFieldProps = Partial<
	Omit<DocumentFieldConfig, "type" | "collection">
> & {
	collection: string | string[];
};

export type DocumentResValue = DocumentFieldValue[];
export type DocumentRef = {
	id: number;
	versionId?: number;
	collectionKey: string;
	fields: Record<string, DocumentField> | null;
};

export type DocumentValidationData = {
	id: number;
	collection_key: string;
};

export type DocumentCustomFieldMapItem = {
	props: DocumentFieldProps;
	config: DocumentFieldConfig;
	response: {
		value: DocumentResValue;
		ref: DocumentRef;
	};
};
