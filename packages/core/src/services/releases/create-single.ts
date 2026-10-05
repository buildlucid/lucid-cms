import type { RichTextJSON } from "@lucidcms/rich-text";
import { copy } from "../../libs/i18n/index.js";
import { ReleasesRepository } from "../../libs/repositories/index.js";
import type { ReleaseDocumentInput } from "../../schemas/releases.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import captureDocument from "./helpers/capture-document.js";
import checkReleaseSize from "./helpers/check-release-size.js";
import setReviewers from "./helpers/set-reviewers.js";

/** Creates a release containing private proposals or immutable environment snapshots. */
const createSingle: ServiceFn<
	[
		{
			title: string;
			description?: RichTextJSON | null;
			documents: ReleaseDocumentInput[];
			reviewerIds?: number[];
			user: LucidUser;
		},
	],
	{ id: number }
> = async (context, data) => {
	const Releases = new ReleasesRepository(context.db);

	const keys = data.documents.map(
		(document) => `${document.collectionKey}:${document.documentId}`,
	);
	if (new Set(keys).size !== keys.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.documents.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const sizeRes = checkReleaseSize(data.documents.length);
	if (sizeRes.error) return sizeRes;

	const now = new Date().toISOString();
	const releaseRes = await Releases.createSingle({
		data: {
			title: data.title,
			description: data.description ?? null,
			status: "open",
			revision: 1,
			created_by: data.user.id,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (releaseRes.error) return releaseRes;

	//* claims documents in the same order as acquireReleaseWrites, so writers can't deadlock
	for (const document of data.documents.toSorted((a, b) =>
		a.collectionKey === b.collectionKey
			? a.documentId - b.documentId
			: a.collectionKey < b.collectionKey
				? -1
				: 1,
	)) {
		const captureRes = await captureDocument(context, {
			...document,
			releaseId: releaseRes.data.id,
			user: data.user,
		});
		if (captureRes.error) return captureRes;
	}

	if (data.reviewerIds?.length) {
		const reviewersRes = await setReviewers(context, {
			release: {
				id: releaseRes.data.id,
				created_by: data.user.id,
				documents: data.documents.map((document) => ({
					collection_key: document.collectionKey,
				})),
				reviewers: [],
			},
			reviewerIds: data.reviewerIds,
			userId: data.user.id,
		});
		if (reviewersRes.error) return reviewersRes;
	}

	return { error: undefined, data: { id: releaseRes.data.id } };
};

export default createSingle;
