import type { BrickQueryResponse } from "../../../../repositories/document-bricks.js";
import type { FieldRefParams } from "../../types.js";
import { documentFieldConfig } from "./config.js";
import DocumentCustomField from "./custom-field.js";
import fetchDocumentRefs from "./fetch-refs.js";
import validateDocumentInputData from "./validate-input.js";

const isBrickQueryResponse = (value: unknown): value is BrickQueryResponse => {
	if (typeof value !== "object" || value === null) return false;

	return "id" in value && "document_id" in value && "collection_key" in value;
};

const formatDocumentRef = (value: unknown, params: FieldRefParams) => {
	if (!isBrickQueryResponse(value)) return null;
	return DocumentCustomField.formatRef(value, params);
};

export default {
	config: documentFieldConfig,
	class: DocumentCustomField,
	fetchRefs: fetchDocumentRefs,
	validateInput: validateDocumentInputData,
	formatRef: formatDocumentRef,
};
