import type { LucidPreviewDraftContent } from "../../libs/db/tables/index.js";
import { copy } from "../../libs/i18n/index.js";
import { PreviewSessionsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkValidateBricksFields from "../documents-bricks/checks/check-validate-bricks-fields.js";
import getUpdateContext from "../documents-versions/helpers/get-update-context.js";
import keepRestrictedContent from "../documents/helpers/keep-restricted-content.js";
import resolveSession from "./helpers/resolve-session.js";

/**
 * Saves or clears a preview draft for its creator, enforcing version edit access and preserving
 * restricted fields. Validates links and variables while allowing unfinished content. The editor
 * already applies `beforeUpsert` transforms. Ignores older revisions to prevent out-of-order
 * writes reverting the preview.
 */
const updateDraft: ServiceFn<
	[
		{
			token: string;
			collectionKey: string;
			documentId: number;
			versionId: number;
			revision: number;
			/** Null clears the draft, so reads return the stored version again. */
			draft: LucidPreviewDraftContent | null;
			user: LucidUser;
		},
	],
	undefined
> = async (context, data) => {
	const sessionRes = await resolveSession(context, { token: data.token });
	if (sessionRes.error) return sessionRes;

	const session = sessionRes.data;
	if (
		session.created_by !== data.user.id ||
		session.entry_collection_key !== data.collectionKey ||
		session.entry_document_id !== data.documentId
	) {
		return {
			error: {
				type: "authorisation",
				code: "preview_invalid",
				message: copy("server:core.documents.preview.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const PreviewSessions = new PreviewSessionsRepository(context.db);

	if (data.draft === null) {
		const clearRes = await PreviewSessions.updateSingle({
			data: {
				draft_version_id: null,
				draft_content_id: null,
				draft_content: null,
				draft_revision: data.revision,
			},
			where: [
				{ key: "id", operator: "=", value: session.id },
				{ key: "draft_revision", operator: "<", value: data.revision },
			],
		});
		if (clearRes.error) return clearRes;

		return { error: undefined, data: undefined };
	}

	const updateContextRes = await getUpdateContext(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
		authUser: data.user,
	});
	if (updateContextRes.error) return updateContextRes;

	const editsSessionVersion =
		session.entry_version_id === null
			? updateContextRes.data.versionType === session.entry_version_type
			: session.entry_version_id === data.versionId;
	if (!editsSessionVersion) {
		return {
			error: {
				type: "authorisation",
				code: "preview_invalid",
				message: copy("server:core.documents.preview.invalid.message"),
				status: 401,
			},
			data: undefined,
		};
	}

	const collection = updateContextRes.data.collection;
	const existingVersion = { id: data.versionId, documentId: data.documentId };
	const contentRes = await keepRestrictedContent(context, {
		collection,
		actor: data.user,
		documentId: data.documentId,
		versionId: data.versionId,
		bricks: data.draft.bricks,
		fields: data.draft.fields,
	});
	if (contentRes.error) return contentRes;

	const draft = {
		bricks: contentRes.data.bricks ?? [],
		fields: contentRes.data.fields ?? [],
	};
	const validateRes = await checkValidateBricksFields(context, {
		...draft,
		collection,
		authUser: data.user,
		existingVersion,
		allowIncomplete: true,
	});
	if (validateRes.error) return validateRes;

	const updateRes = await PreviewSessions.updateSingle({
		data: {
			draft_version_id: data.versionId,
			draft_content_id: updateContextRes.data.contentId,
			draft_content: draft,
			draft_revision: data.revision,
		},
		where: [
			{ key: "id", operator: "=", value: session.id },
			{ key: "draft_revision", operator: "<", value: data.revision },
		],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateDraft;
