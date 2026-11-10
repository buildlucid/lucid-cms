import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import type { ResolvedCollectionLocalization } from "../../../libs/collection/helpers/resolve-collection-localization.js";
import applyTranslationChanges from "../../../libs/translations/apply-translation-changes.js";
import type { LucidActor } from "../../../types/hono.js";
import type { TranslationChange } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkNotHeld from "../../document-editors/check-not-held.js";
import updateVersion from "../../documents-versions/update-single.js";
import readDocumentContent from "../../documents/helpers/read-document-content.js";

/**
 * Writes proposal translations in the caller's transaction. Preserves newer field edits unless
 * `overwrite` is set, and rejects concurrent proposal saves.
 */
const saveTranslatedProposals: ServiceFn<
	[
		{
			collection: CollectionDefinition;
			localization: ResolvedCollectionLocalization;
			proposals: Array<{ documentId: number; versionId: number }>;
			changes: Array<TranslationChange & { documentId: number }>;
			overwrite: boolean;
			user: LucidActor;
			agentRunId?: string;
			/** Refuses proposals someone has open in an editor, as agent writes do. */
			editorHolds?: { requestId: number; userId: number | null };
		},
	],
	undefined
> = async (context, data) => {
	for (const proposal of data.proposals) {
		const changes = data.changes.filter(
			(change) => change.documentId === proposal.documentId,
		);
		if (changes.length === 0) continue;

		if (data.editorHolds) {
			const held = await checkNotHeld(context, {
				collectionKey: data.collection.key,
				documentId: proposal.documentId,
				requestId: data.editorHolds.requestId,
				userId: data.editorHolds.userId,
			});
			if (held.error) return held;
		}

		const contentRes = await readDocumentContent(context, {
			collectionKey: data.collection.key,
			id: proposal.documentId,
			versionId: proposal.versionId,
		});
		if (contentRes.error) return contentRes;

		const content = applyTranslationChanges({
			collection: data.collection,
			localization: data.localization,
			content: contentRes.data.stored,
			changes,
			overwrite: data.overwrite,
		});
		const updateRes = await updateVersion(context, {
			collectionKey: data.collection.key,
			documentId: proposal.documentId,
			versionId: proposal.versionId,
			baseContentId: contentRes.data.version.contentId ?? undefined,
			userId: data.user.id,
			authUser: data.user,
			agentRunId: data.agentRunId,
			bricks: content.bricks,
			fields: content.fields,
		});
		if (updateRes.error) return updateRes;
	}

	return { error: undefined, data: undefined };
};

export default saveTranslatedProposals;
