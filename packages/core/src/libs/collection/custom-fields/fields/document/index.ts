import { documentFieldConfig } from "./config.js";
import DocumentCustomField from "./custom-field.js";
import fetchDocumentRefs from "./fetch-refs.js";
import formatDocumentRef from "./format-ref.js";
import validateDocumentInputData from "./validate-input.js";

export default {
	config: documentFieldConfig,
	class: DocumentCustomField,
	fetchRefs: fetchDocumentRefs,
	validateInput: validateDocumentInputData,
	formatRef: formatDocumentRef,
};
