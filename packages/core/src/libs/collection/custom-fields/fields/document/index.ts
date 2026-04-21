import { createDocumentValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { createFieldRefFetchPlan } from "../../utils/ref-fetch.js";
import { documentFieldConfig } from "./config.js";
import DocumentCustomField from "./custom-field.js";
import fetchDocumentRefs from "./fetch-refs.js";
import formatDocumentRef from "./format-ref.js";
import nullifyDocumentReferences from "./nullify-references.js";
import validateDocumentInputData from "./validate-input.js";

export default {
	config: documentFieldConfig,
	class: DocumentCustomField,
	planFetchRefs: createFieldRefFetchPlan,
	fetchRefs: fetchDocumentRefs,
	validateInput: validateDocumentInputData,
	formatRef: formatDocumentRef,
	nullifyReferences: nullifyDocumentReferences,
	clientTypeGen: createDocumentValueFieldTypeGenerator(),
};
