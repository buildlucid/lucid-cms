import DocumentCustomField from "./custom-field.js";
import fetchDocumentRefs from "./fetch-refs.js";
import validateDocumentInputData from "./validate-input.js";

export default {
	class: DocumentCustomField,
	fetchRefs: fetchDocumentRefs,
	validateInput: validateDocumentInputData,
};
