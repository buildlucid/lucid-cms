import type { RichTextJSON } from "@lucidcms/rich-text";
import { copy } from "../../libs/i18n/index.js";
import { RequestsRepository } from "../../libs/repositories/index.js";
import type { RequestDocumentInput } from "../../schemas/requests.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import captureDocument from "./helpers/capture-document.js";
import checkRequestSize from "./helpers/check-request-size.js";
import resolveMentions from "./helpers/resolve-mentions.js";
import setReviewers from "./helpers/set-reviewers.js";

const createSingle: ServiceFn<
	[
		{
			title: string;
			description?: RichTextJSON | null;
			documents: RequestDocumentInput[];
			reviewerIds?: number[];
			user: LucidUser;
		},
	],
	{ id: number }
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);

	const keys = data.documents.map(
		(document) => `${document.collectionKey}:${document.documentId}`,
	);
	if (new Set(keys).size !== keys.length) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.documents.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const sizeRes = checkRequestSize(data.documents.length);
	if (sizeRes.error) return sizeRes;

	const descriptionRes = data.description
		? await resolveMentions(context, {
				request: {
					documents: data.documents.map((document) => ({
						collection_key: document.collectionKey,
					})),
				},
				body: data.description,
			})
		: undefined;
	if (descriptionRes?.error) return descriptionRes;

	const now = new Date().toISOString();
	const requestRes = await Requests.createSingle({
		data: {
			type: "publish",
			title: data.title,
			description: descriptionRes?.data ?? null,
			status: "open",
			revision: 1,
			created_by: data.user.id,
			created_at: now,
			updated_at: now,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (requestRes.error) return requestRes;

	//* claims documents in the same order as acquireRequestWrites, so writers can't deadlock
	for (const document of data.documents.toSorted((a, b) =>
		a.collectionKey === b.collectionKey
			? a.documentId - b.documentId
			: a.collectionKey < b.collectionKey
				? -1
				: 1,
	)) {
		const captureRes = await captureDocument(context, {
			...document,
			requestId: requestRes.data.id,
			user: data.user,
		});
		if (captureRes.error) return captureRes;
	}

	if (data.reviewerIds?.length) {
		const reviewersRes = await setReviewers(context, {
			request: {
				id: requestRes.data.id,
				type: "publish",
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

	return { error: undefined, data: { id: requestRes.data.id } };
};

export default createSingle;
