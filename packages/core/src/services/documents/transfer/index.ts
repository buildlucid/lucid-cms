import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
import exportDocuments from "./export.js";
import identifyDocuments from "./identify.js";
import importDocument from "./import.js";
import matchDocuments from "./match.js";
import { documentEntrySchema, documentSelectionSchema } from "./schema.js";

/** Exports documents' latest content and imports it as latest or create requests, matching documents by uid. */
const documentsTransfer = defineTransfer({
	key: "documents",
	label: {
		singular: copy("server:core.transfer.documents.singular"),
		plural: copy("server:core.transfer.documents.plural"),
	},
	entry: documentEntrySchema,
	selection: documentSelectionSchema,
	include: "linked",
	identify: identifyDocuments,
	match: matchDocuments,
	export: exportDocuments,
	import: importDocument,
	describe: (entry) => entry.label,
});

export default documentsTransfer;
