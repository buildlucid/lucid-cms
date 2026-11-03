import type { LucidPreviewDraftContent } from "../../../libs/db/tables/index.js";
import { PreviewSessionsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { PreviewSessionDocumentTarget } from "../types.js";

/**
 * Returns a draft only for its entry document, base version and content ID. Other reads and drafts
 * superseded by a save return null.
 */
const readDraft: ServiceFn<
	[
		{
			preview: PreviewSessionDocumentTarget;
			collectionKey: string;
			documentId: number;
			versionId: number;
			/** The read version's content ID, which changes with every save. */
			contentId: string | null | undefined;
		},
	],
	LucidPreviewDraftContent | null
> = async (context, data) => {
	if (
		data.preview.entry.collectionKey !== data.collectionKey ||
		data.preview.entry.documentId !== data.documentId
	) {
		return { error: undefined, data: null };
	}

	const PreviewSessions = new PreviewSessionsRepository(context.db);
	const sessionRes = await PreviewSessions.selectSingle({
		select: ["draft_version_id", "draft_content_id", "draft_content"],
		where: [{ key: "id", operator: "=", value: data.preview.sessionId }],
		validation: { enabled: false },
	});
	if (sessionRes.error) return sessionRes;

	const session = sessionRes.data;
	if (
		!session ||
		session.draft_version_id !== data.versionId ||
		session.draft_content_id !== data.contentId
	) {
		return { error: undefined, data: null };
	}

	return { error: undefined, data: session.draft_content };
};

export default readDraft;
