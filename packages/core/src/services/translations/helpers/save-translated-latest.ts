import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type { ResolvedCollectionLocalization } from "../../../libs/collection/helpers/resolve-collection-localization.js";
import { copy } from "../../../libs/i18n/index.js";
import applyTranslationChanges from "../../../libs/translations/apply-translation-changes.js";
import type { LucidActor } from "../../../types/hono.js";
import type {
	TranslationChange,
	TranslationFailure,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkNotHeld from "../../document-editors/check-not-held.js";
import readDocumentContent from "../../documents/helpers/read-document-content.js";
import upsertSingle from "../../documents/upsert-single.js";

/** Saves that land between reading latest and writing it are read again, up to this many times. */
const attempts = 3;

/**
 * Saves each document independently without review. Rejects concurrent version changes and rereads
 * latest, preserving newer translations unless `overwrite` is set. Reports failures per document.
 */
const saveTranslatedLatest: ServiceFn<
	[
		{
			collection: CollectionBuilder;
			localization: ResolvedCollectionLocalization;
			documentIds: number[];
			changes: Array<TranslationChange & { documentId: number }>;
			overwrite: boolean;
			user: LucidActor;
			agentRunId?: string;
			/** Refuses documents someone has open in an editor, as agent writes do. */
			editorHolds?: { userId: number | null };
		},
	],
	{ documents: number[]; failures: TranslationFailure[] }
> = async (context, data) => {
	const documents: number[] = [];
	const failures: TranslationFailure[] = [];

	for (const documentId of data.documentIds) {
		const changes = data.changes.filter(
			(change) => change.documentId === documentId,
		);
		if (changes.length === 0) continue;

		const save = async () => {
			if (data.editorHolds) {
				const held = await checkNotHeld(context, {
					collectionKey: data.collection.key,
					documentId,
					requestId: null,
					userId: data.editorHolds.userId,
				});
				if (held.error) return held;
			}

			const contentRes = await readDocumentContent(context, {
				collectionKey: data.collection.key,
				id: documentId,
			});
			if (contentRes.error) return contentRes;

			const content = applyTranslationChanges({
				collection: data.collection,
				localization: data.localization,
				content: contentRes.data.stored,
				changes,
				overwrite: data.overwrite,
			});
			return upsertSingle(context, {
				collectionKey: data.collection.key,
				documentId,
				baseContentId: contentRes.data.version.contentId ?? undefined,
				userId: data.user.id,
				authUser: data.user,
				agentRunId: data.agentRunId,
				bricks: content.bricks,
				fields: content.fields,
			});
		};

		let savedRes = await save();
		for (
			let attempt = 1;
			attempt < attempts && savedRes.error?.status === 409;
			attempt++
		) {
			savedRes = await save();
		}
		if (savedRes.error) {
			const message = context.translate(
				savedRes.error.message ??
					copy("server:core.translations.latest.failed"),
			);
			for (const locale of new Set(changes.map((change) => change.locale))) {
				failures.push({ documentId, locale, field: null, message });
			}
			continue;
		}

		documents.push(documentId);
	}

	return { error: undefined, data: { documents, failures } };
};

export default saveTranslatedLatest;
