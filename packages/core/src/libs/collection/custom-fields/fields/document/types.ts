import type { FieldAltResponse } from "../../../../../types/response.js";
import type { SharedFieldConfig } from "../../types.js";

export type DocumentFieldValue = {
	id: number;
	collectionKey: string;
};

export interface DocumentFieldConfig extends SharedFieldConfig {
	type: "document";
	collection: string;
	details: {
		label?: string | Record<string, string>;
		summary?: string | Record<string, string>;
	};
	config: {
		useTranslations?: boolean;
		isHidden?: boolean;
		isDisabled?: boolean;
		multiple?: boolean;
		default?: DocumentFieldValue[];
	};
	validation?: {
		required?: boolean;
		minItems?: number;
		maxItems?: number;
	};
}

export type DocumentFieldProps = Partial<
	Omit<DocumentFieldConfig, "type" | "collection">
> & {
	collection: string;
};

export type DocumentResValue = DocumentFieldValue[];
export type DocumentRef = {
	id: number;
	versionId?: number;
	collectionKey: string;
	fields: Record<string, FieldAltResponse> | null;
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
