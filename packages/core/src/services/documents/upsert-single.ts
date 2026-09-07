import withTransaction from "../../utils/services/with-transaction.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import saveDocument from "./helpers/save-document.js";

/** Saves the complete admin payload. Partial authoring values use writeSingle. */
const upsertSingle: typeof saveDocument = (context, data) =>
	withTransaction(
		context,
		async (context) => {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: data.documentId === undefined ? [] : [data.documentId],
			});
			if (acquired.error) return acquired;

			await using _claims = acquired.data;
			return await saveDocument(context, data);
		},
		{ isolate: true },
	);

export default upsertSingle;
