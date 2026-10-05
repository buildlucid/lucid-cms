import { copy } from "../../libs/i18n/index.js";
import { ReleaseEventsRepository } from "../../libs/repositories/index.js";
import type { ReleaseDocumentInput } from "../../schemas/releases.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireReleaseWrites from "./helpers/acquire-release-writes.js";
import captureDocument from "./helpers/capture-document.js";
import checkReleaseSize from "./helpers/check-release-size.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getReleaseAccess from "./helpers/get-release-access.js";

/** Adds fresh proposals or snapshots, so the whole group needs approving again. */
const addDocuments: ServiceFn<
	[{ id: number; documents: ReleaseDocumentInput[]; user: LucidUser }],
	undefined
> = async (context, data) => {
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const claimRes = await acquireReleaseWrites(context, {
		id: data.id,
		user: data.user,
		additionalDocuments: data.documents,
	});
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const release = claimRes.data.release;
	if (!getReleaseAccess(context, { release, user: data.user }).edit) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	const keys = [
		...release.documents.map(
			(document) => `${document.collection_key}:${document.document_id}`,
		),
		...data.documents.map(
			(document) => `${document.collectionKey}:${document.documentId}`,
		),
	];
	if (new Set(keys).size !== keys.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.document.duplicate"),
				status: 409,
			},
			data: undefined,
		};
	}

	const sizeRes = checkReleaseSize(keys.length);
	if (sizeRes.error) return sizeRes;

	for (const document of data.documents) {
		const captureRes = await captureDocument(context, {
			...document,
			releaseId: release.id,
			user: data.user,
			skipDocumentWriteClaims: true,
		});
		if (captureRes.error) return captureRes;
	}

	const dismissRes = await dismissApproval(context, {
		ids: [release.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	const eventsRes = await ReleaseEvents.createEvents({
		data: data.documents.map((document) => ({
			release_id: release.id,
			user_id: data.user.id,
			type: "document_added" as const,
			metadata: {
				collectionKey: document.collectionKey,
				documentId: document.documentId,
			},
		})),
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default addDocuments;
