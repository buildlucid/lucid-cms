import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
import { LucidError } from "../../../utils/errors/index.js";
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
	identify: async ({ context, ...props }) => {
		const result = await identifyDocuments(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	match: async ({ context, ...props }) => {
		const result = await matchDocuments(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	export: async ({ context, ...props }) => {
		const result = await exportDocuments(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	import: async ({ context, ...props }) => {
		const result = await importDocument(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	describe: (entry) => entry.label,
});

export default documentsTransfer;
