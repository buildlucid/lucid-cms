import checks from "./checks/index.js";
import client from "./client/index.js";
import upsertSingle from "./upsert-single.js";
import deleteMultiple from "./delete-multiple.js";
import deleteSingle from "./delete-single.js";
import deleteSinglePermanently from "./delete-single-permanently.js";
import getSingle from "./get-single.js";
import getMultipleFieldMeta from "./get-multiple-field-meta.js";
import getMultiple from "./get-multiple.js";
import getMultipleRevisions from "./get-multiple-revisions.js";
import nullifyDocumentReferences from "./nullify-document-references.js";
import restoreMultiple from "./restore-multiple.js";

export default {
	checks,
	client,
	upsertSingle,
	deleteMultiple,
	deleteSingle,
	deleteSinglePermanently,
	getSingle,
	getMultiple,
	getMultipleFieldMeta,
	getMultipleRevisions,
	nullifyDocumentReferences,
	restoreMultiple,
};
