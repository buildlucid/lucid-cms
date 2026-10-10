import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import checkSaveHold from "../document-editors/check-save-hold.js";
import acquireDocumentWrites from "./helpers/acquire-document-writes.js";
import readDocumentState from "./helpers/read-document-state.js";
import saveDocument from "./helpers/save-document.js";

/** Saves the complete admin payload. Partial authoring values use writeSingle. */
const upsertSingle: ServiceFn<
	[
		Parameters<typeof saveDocument>[1] & {
			/** The latest content the edit was based on. The save is refused when latest has been saved since. */
			baseContentId?: string;
			/** The admin tab saving, refused if another tab holds latest. */
			editorTabId?: string;
		},
	],
	number
> = (context, { baseContentId, editorTabId, ...data }) =>
	withTransaction(
		context,
		async (context) => {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: data.collectionKey,
				ids: data.documentId === undefined ? [] : [data.documentId],
			});
			if (acquired.error) return acquired;

			await using _claims = acquired.data;

			if (baseContentId !== undefined && data.documentId !== undefined) {
				const state = await readDocumentState(context, {
					collectionKey: data.collectionKey,
					id: data.documentId,
					allowWriteLock: true,
				});
				if (state.error) return state;

				if (state.data.version.contentId !== baseContentId) {
					return {
						error: {
							type: "basic",
							name: copy("server:core.documents.versions.changed.name"),
							message: copy("server:core.documents.versions.changed.message"),
							status: 409,
						},
						data: undefined,
					};
				}
			}

			if (
				editorTabId !== undefined &&
				data.documentId !== undefined &&
				data.userId !== null
			) {
				const held = await checkSaveHold(context, {
					collectionKey: data.collectionKey,
					documentId: data.documentId,
					requestId: null,
					tabId: editorTabId,
					userId: data.userId,
				});
				if (held.error) return held;
			}

			return await saveDocument(context, data);
		},
		{ isolate: true },
	);

export default upsertSingle;
