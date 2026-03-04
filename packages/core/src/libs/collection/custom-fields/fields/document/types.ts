import type { FieldAltResponse } from "../../../../../types/response.js";
import type { OmitDefault, SharedFieldConfig } from "../../types.js";

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
		default?: number | null;
	};
	validation?: {
		required?: boolean;
	};
}

export type DocumentFieldProps = Partial<
	OmitDefault<Omit<DocumentFieldConfig, "type">>
> & {
	collection: string;
};

export type DocumentResValue = number | null;
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
